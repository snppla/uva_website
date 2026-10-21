#!/bin/sh
# Copies the database and uploaded files from one deployment of this site to another on the
# same Docker host (e.g. production -> sandbox under Dokploy). Run on the server:
#
#   sh deploy/copy-to-sandbox.sh <production project> <sandbox project>
#
# Project names are the Docker Compose projects Dokploy created; list them with
# `docker compose ls`. The sandbox's database and files are replaced; production is only read.
set -eu

from="${1:-}"
to="${2:-}"
if [ -z "$from" ] || [ -z "$to" ]; then
  echo "Usage: sh $0 <production project> <sandbox project>   (see: docker compose ls)" >&2
  exit 1
fi
if [ "$from" = "$to" ]; then
  echo "The two projects must be different." >&2
  exit 1
fi

container() { # <project> <service>
  id=$(docker ps -q --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.service=$2")
  if [ -z "$id" ] || [ "$(echo "$id" | wc -l)" -ne 1 ]; then
    echo "Can't find exactly one running '$2' container in project '$1'." >&2
    exit 1
  fi
  echo "$id"
}
volume() { # <project> <volume>
  name=$(docker volume ls -q --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.volume=$2")
  if [ -z "$name" ]; then
    echo "Can't find the '$2' volume of project '$1'." >&2
    exit 1
  fi
  echo "$name"
}

from_db=$(container "$from" db)
to_db=$(container "$to" db)
to_app=$(container "$to" app)
from_uploads=$(volume "$from" uploads)
to_uploads=$(volume "$to" uploads)

echo "This replaces ALL data and files in '$to' with a copy of '$from'."
printf "Type the sandbox project name (%s) to continue: " "$to"
read -r answer
[ "$answer" = "$to" ] || { echo "Not confirmed; nothing changed."; exit 1; }

# Stop the sandbox site so nothing writes while its data is replaced.
docker stop "$to_app" >/dev/null
trap 'docker start "$to_app" >/dev/null' EXIT

echo "Copying the database..."
docker exec "$to_db" psql -q -v ON_ERROR_STOP=1 -U club club \
  -c "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec "$from_db" pg_dump --no-owner --no-privileges -U club club |
  docker exec -i "$to_db" psql -q -v ON_ERROR_STOP=1 -U club club >/dev/null

echo "Copying uploaded files..."
docker run --rm -v "$from_uploads:/from:ro" -v "$to_uploads:/to" alpine \
  sh -c 'find /to -mindepth 1 -delete && cp -a /from/. /to/'

# Starting the sandbox applies any migrations it has that production doesn't yet.
docker start "$to_app" >/dev/null
trap - EXIT
echo "Done. Log in to the sandbox with your production admin account."

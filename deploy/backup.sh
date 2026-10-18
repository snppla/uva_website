#!/bin/sh
# Runs inside the `backup` container. Writes:
#   /backups/db-YYYY-MM-DD.sql.gz       full database dump
#   /backups/uploads-YYYY-MM-DD.tar.gz  photos and documents
set -eu
stamp=$(date +%F)
pg_dump --no-owner | gzip > "/backups/db-$stamp.sql.gz.tmp"
mv "/backups/db-$stamp.sql.gz.tmp" "/backups/db-$stamp.sql.gz"
tar -czf "/backups/uploads-$stamp.tar.gz" -C /uploads .
find /backups -name 'db-*.sql.gz' -mtime +14 -delete
find /backups -name 'uploads-*.tar.gz' -mtime +14 -delete
echo "Backup $stamp complete"

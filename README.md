# Club Website

Website and admin panel for the model airplane club: news posts, events calendar, photo gallery,
downloadable documents, PayPal membership renewal, and a member roster.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind) · PostgreSQL with Drizzle ORM ·
Docker Compose, served over HTTPS through a Cloudflare Tunnel.

## What's where

| Public page   | What it shows                                                          |
| ------------- | ---------------------------------------------------------------------- |
| `/`           | Intro, latest news, upcoming events, recent photos                     |
| `/about`      | Club info (editable in admin)                                          |
| `/blog`       | News posts                                                             |
| `/events`     | Month calendar; `/events/calendar.ics` is a subscribable feed          |
| `/gallery`    | Photo albums with a lightbox viewer                                    |
| `/resources`  | Bylaws, rules, forms (downloads)                                       |
| `/membership` | Membership options, each with a PayPal button                          |

Officers log in at **`/admin`** to manage all of the above, plus the member roster
(search, renew +1 year, CSV import/export) and other admin accounts.

Code layout:

- `src/site.config.ts` — club name, tagline, time zone and nav. **Edit this first.**
- `src/app/(site)/` — public pages · `src/app/admin/` — admin panel
- `src/db/schema.ts` — database tables · `drizzle/` — generated SQL migrations
- `src/lib/` — auth, data queries, file storage, dates, markdown
- `deploy/` — backup script

How renewals work: a member clicks the PayPal button for their membership type and pays. When
PayPal emails you about the payment, open **Admin → Members** and click **Renew +1 yr** for that
person. (Renewal is not automatic. That would need the PayPal API and webhooks.)

## Local development

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env.local      # then set SESSION_SECRET (openssl rand -base64 32)
npm run db:up                   # starts Postgres in Docker
npm run dev                     # http://localhost:3000
```

On startup the app applies any pending migrations. If no admin account exists yet, it prints a
one-time **setup link** in the terminal; open it to create your login (see
[Admin accounts](#admin-accounts)). Uploaded files go to `./data/uploads`.

### Changing the database schema

1. Edit `src/db/schema.ts`
2. `npm run db:generate -- --name describe_the_change` (writes a new SQL file to `drizzle/`)
3. Commit the migration. It's applied automatically the next time the app starts.

### Note on this Next.js version

Next 16 uses Cache Components, and `node_modules/next/dist/docs/` has the docs for the installed
version. Public pages render a static shell and stream database content inside `<Suspense>`. Every
query in `src/lib/data.ts` calls `connection()` first, so nothing touches the database at build time.

## Deploying to a Linode (or any VPS)

HTTPS is provided by a **Cloudflare Tunnel**. The `cloudflared` container connects *out* to
Cloudflare, and Cloudflare serves the site to visitors over HTTPS. The server doesn't need ports
80/443 open, and there's no certificate to manage.

1. **Create the server.** A Nanode 1 GB with Ubuntu 24.04 LTS is plenty. Enable Linode Backups
   (a few dollars a month) for off-server copies.
2. **Create the tunnel.** Your domain must use Cloudflare DNS. In the Cloudflare dashboard go to
   *Zero Trust → Networks → Tunnels → Create a tunnel* (type **Cloudflared**) and copy the token.
   Under *Public Hostname*, add your domain with service **HTTP** and URL **`app:3000`**. Optionally
   add `www` the same way, or set up a Cloudflare redirect rule from `www` to the bare domain.
3. **Install Docker** on the server:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. **Get the code onto the server** (e.g. `git clone` your repository into `/opt/club-site`), then:
   ```bash
   cd /opt/club-site
   cp .env.production.example .env
   nano .env    # set TUNNEL_TOKEN, POSTGRES_PASSWORD, SESSION_SECRET, SITE_URL
   docker compose up -d --build
   ```
5. **Create your admin login.** Get the one-time setup link from the logs and open it:
   ```bash
   docker compose logs app | grep -A2 "No admin accounts"
   ```
6. **Firewall** (recommended): only SSH needs to be reachable.
   ```bash
   ufw allow OpenSSH && ufw enable
   ```
7. **Cloudflare settings** (recommended): under *SSL/TLS → Edge Certificates*, turn on
   **Always Use HTTPS**.

### Admin accounts

There are no default or temporary passwords. Every admin chooses their own through a one-time link:

- **First admin:** while no admin accounts exist, each startup prints a setup link to the logs
  (valid 24 hours). Restart the app to get a fresh one.
- **More officers:** *Admin → Admins & password → Invite an admin*. Enter their name and email,
  then send them the link it gives you. It works once, expires in 7 days, and can be revoked.
- **Locked out entirely** (every admin forgot their password): delete the admin logins and
  restart; a new setup link appears in the logs. Content and members are not affected.
  ```bash
  docker compose exec db psql -U club -c "delete from admins;"
  docker compose restart app && docker compose logs app | grep -A2 "No admin accounts"
  ```

Only a hash of each link's token is stored, so links can't be recovered from the database or backups.

### Seeding a deployed site

Club photos and content can be uploaded from your computer through the site's import API. The
photos (`data/seed-photos/`) and `data/seed-content.json` stay on your machine; they're not in git.

1. On the server (e.g. in Dokploy's environment settings), set `SEED_API_TOKEN` to a long random
   value (`openssl rand -hex 32`) and redeploy. Without it the import API doesn't exist (404).
2. On your computer, put the same value in `.env.seed` (gitignored):
   ```env
   SEED_API_TOKEN=...
   ```
3. Run:
   ```bash
   npm run seed:remote -- https://sand.utahvalleyaeromodelers.com            # add what's missing
   npm run seed:remote -- https://sand.utahvalleyaeromodelers.com --reset    # wipe content first
   ```
   It's safe to re-run: photos already uploaded are skipped. `--reset` asks you to type the
   hostname, then deletes all posts, events, albums, photos and page settings (admin accounts
   and members are kept).
4. Remove `SEED_API_TOKEN` from the server afterwards to switch the import API off.

For the local dev database, `npm run db:seed` (`-- --reset`) does the same directly.

### Updating

```bash
cd /opt/club-site && git pull && docker compose up -d --build
```

### Backups

The `backup` container writes `backups/db-YYYY-MM-DD.sql.gz` and `backups/uploads-YYYY-MM-DD.tar.gz`
once a day and keeps 14 days. These live on the same server, so also enable Linode Backups or copy
the `backups/` folder somewhere else from time to time.

Restore:

```bash
# database (into an empty database)
gunzip -c backups/db-2026-10-18.sql.gz | docker compose exec -T db psql -U club club
# uploaded files
docker compose run --rm -v "$PWD/backups:/backups" --entrypoint sh app \
  -c "tar -xzf /backups/uploads-2026-10-18.tar.gz -C /data/uploads"
```

### Logs

```bash
docker compose logs -f app
```

# Squigs Reloaded Creator Portal

A separate Node.js web app for Discord-authenticated Squig Survival image submissions. It verifies Ugly Labs Discord membership, stores images by URL, queues submissions for moderation, and only writes to The Gauntlet's live `squig_survival_images` table after admin approval.

## What it does

- Uses Discord OAuth login to collect the submitter's Discord ID, username, and display name.
- Confirms the user is in the configured Ugly Labs Discord server.
- Blocks submissions for non-members and sends them to `squigs.io/discord`.
- Accepts image uploads and stores a URL in Postgres.
- Writes pending submissions to `squig_survival_image_submissions`.
- Restricts admin review to Discord-authenticated users listed in `ADMIN_DISCORD_IDS`.
- On approval, inserts into the existing live table expected by The Gauntlet bot: `image_url`, `user_id`, `added_by`, `created_at`, `era_keys`, `reward_points`.
- Preserves the existing route and cookie contract while using Squigs Reloaded links and copy.
- Blocks obsolete mint CTA copy with `npm run check:mint`.

## Environment variables

Copy `.env.example` to `.env` and fill in values.

Required: `SESSION_SECRET`, `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_GUILD_ID`

Useful: `ADMIN_DISCORD_IDS=123,456`, `LIVE_IMAGE_TABLE=squig_survival_images`, `SESSION_TABLE=session`, `PUBLIC_BASE_URL=https://your-service.up.railway.app`, `MAX_UPLOAD_MB=10`, `TRUSTED_PROXY=1`

Storage:

- `STORAGE_DRIVER=local` for local development.
- `STORAGE_DRIVER=s3` for production on Railway.
- With `s3`, also set `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.

## Discord OAuth setup

Create a Discord OAuth2 application and configure a redirect URI like `https://your-domain/auth/discord/callback`. The app requests `identify` and `guilds`, then checks `/users/@me/guilds` for membership in `DISCORD_GUILD_ID`.

## Database notes

This app is intentionally separate from The Gauntlet bot runtime, but it must point at the same Postgres database. On startup it connects to `DATABASE_URL` and verifies required tables exist. It does not create or alter tables on boot.

Run the read-only preflight before migrations or cutover:

```bash
npm run db:preflight
```

Approval flow:

1. Insert pending uploads into `squig_survival_image_submissions`.
2. Admin approves.
3. App inserts a live row into `squig_survival_images`.
4. App marks the pending row as `approved`.

Decline flow:

1. Admin declines.
2. App marks the pending row as `declined`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Railway deployment

1. Create a new Railway service from this repo.
2. Attach the same Postgres service used by The Gauntlet so `DATABASE_URL` points to the existing DB.
3. Set all environment variables from `.env.example`.
4. Set `PUBLIC_BASE_URL` to the Railway public URL.
5. For production uploads, set `STORAGE_DRIVER=s3` and provide S3-compatible object storage values.
6. Deploy.

## Important operational note

`local` file storage is fine for local development, but Railway's local filesystem is not durable enough for production image hosting. Use `s3` in production so approved `image_url` values remain stable for The Gauntlet bot.

## Migration

Run reviewed SQL migrations against the same Postgres database before deploying:

1. `migrations/001_create_pending_submissions.sql`
2. `migrations/002_rebuild_foundation.sql`

Do not apply any live-table schema change without a preflight/reconciliation report and explicit owner approval.

## Checks

```bash
npm run test:all
npm run check:mint
```

Integration tests require a disposable PostgreSQL database in `TEST_DATABASE_URL`. The test harness refuses production-looking database names and never falls back to `DATABASE_URL`.

Node.js 24 LTS is the target runtime for the rebuild. The current foundation still supports the existing Node 18+ baseline until the planned TypeScript/Express migration.

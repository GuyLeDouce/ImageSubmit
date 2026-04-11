# Squig Survival Image Submission App

A separate Node.js web app for Discord-authenticated Squig Survival image submissions. It verifies Ugly Labs Discord membership, stores images by URL, queues submissions for moderation, and only writes to The Gauntlet's live `squig_survival_images` table after admin approval.

## What it does

- Uses Discord OAuth login to collect the submitter's Discord ID, username, and display name.
- Confirms the user is in the configured Ugly Labs Discord server.
- Blocks submissions for non-members and sends them to `squigs.io/discord`.
- Accepts image uploads and stores a URL in Postgres.
- Writes pending submissions to `squig_survival_image_submissions`.
- Restricts admin review to Discord-authenticated users listed in `ADMIN_DISCORD_IDS`.
- On approval, inserts into the existing live table expected by The Gauntlet bot: `image_url`, `user_id`, `added_by`, `created_at`, `era_keys`, `reward_points`.

## Environment variables

Copy `.env.example` to `.env` and fill in values.

Required: `SESSION_SECRET`, `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_GUILD_ID`

Useful: `ADMIN_DISCORD_IDS=123,456`, `LIVE_IMAGE_TABLE=squig_survival_images`, `PUBLIC_BASE_URL=https://your-service.up.railway.app`, `MAX_UPLOAD_MB=10`

Storage:

- `STORAGE_DRIVER=local` for local development.
- `STORAGE_DRIVER=s3` for production on Railway.
- With `s3`, also set `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.

## Discord OAuth setup

Create a Discord OAuth2 application and configure a redirect URI like `https://your-domain/auth/discord/callback`. The app requests `identify` and `guilds`, then checks `/users/@me/guilds` for membership in `DISCORD_GUILD_ID`.

## Database notes

This app is intentionally separate from The Gauntlet bot runtime, but it must point at the same Postgres database. On startup it connects to `DATABASE_URL`, verifies the live table in `LIVE_IMAGE_TABLE` exists, and creates the moderation table if needed.

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

Run the SQL in `migrations/001_create_pending_submissions.sql` against the same Postgres database if you want an explicit migration step before first deploy. The app also creates the table automatically at startup.

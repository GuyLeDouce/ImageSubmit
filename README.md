# Ugly City Image Factory

A separate Node.js web app for Discord-authenticated Squig Survival image submissions for **The Rise of Ugly City**. It verifies Ugly Labs Discord membership, stores uploads by URL, queues submissions for admin moderation, and only writes approved images to The Gauntlet's live `squig_survival_images` table.

## What it does

- Uses Discord OAuth login to collect the submitter's Discord ID, username, and display name.
- Confirms the user is in the configured Ugly Labs Discord server.
- Blocks submissions for non-members and sends them to `squigs.io/discord`.
- Requires every submission to select one of the 100 Ugly City milestones.
- Requires the user to confirm the image includes at least one Squig.
- Allows optional notes for other NFTs, collections, images, characters, backgrounds, or memes included in the image.
- Writes pending submissions to `squig_survival_image_submissions` with `era_key = "ugly_city"`, milestone metadata, Squig confirmation, prompt text, and a 100 $CHARM reward default.
- Restricts admin review to Discord-authenticated users listed in `ADMIN_DISCORD_IDS`.
- Lets admins approve or decline each image. Images without a clearly visible Squig should be declined.
- On approval, inserts into the existing live table expected by The Gauntlet with `era_keys = "ugly_city"` and `reward_points = 100` by default.
- Approved images become eligible for the Ugly City image pool; approval does not guarantee in-game appearance.
- Supports local uploads for development and S3-compatible uploads for production.

## Environment variables

Copy `.env.example` to `.env` and fill in values.

Required: `SESSION_SECRET`, `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_GUILD_ID`

Useful: `ADMIN_DISCORD_IDS=123,456`, `LIVE_IMAGE_TABLE=squig_survival_images`, `SESSION_TABLE=session`, `PUBLIC_BASE_URL=https://your-service.up.railway.app`, `MAX_UPLOAD_MB=10`, `TRUSTED_PROXY=1`

Storage:

- `STORAGE_DRIVER=local` for local development.
- `STORAGE_DRIVER=s3` for production on Railway or any production host.
- With `s3`, also set `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.

## Discord OAuth setup

Create a Discord OAuth2 application and configure a redirect URI like `https://your-domain/auth/discord/callback`. The app requests `identify` and `guilds`, then checks `/users/@me/guilds` for membership in `DISCORD_GUILD_ID`.

## Database notes

This app is intentionally separate from The Gauntlet bot runtime, but it must point at the same Postgres database. The production `start` script runs the reviewed, ledgered migrations before booting Express, then startup verifies required tables exist.

The live image table is not created by this app. If startup reports `relation "squig_survival_images" does not exist` or `Live image table 'squig_survival_images' was not found`, Railway is pointed at the wrong or empty Postgres database. Attach the same database used by The Gauntlet, or set `LIVE_IMAGE_TABLE` to the actual existing live table name.

Run the read-only preflight before migrations or cutover:

```bash
npm run db:preflight
```

Approval flow:

1. Insert pending uploads into `squig_survival_image_submissions`.
2. Admin approves.
3. App inserts a live row into `squig_survival_images`.
4. The live row keeps `era_keys = "ugly_city"` so The Gauntlet can find Ugly City images.
5. App marks the pending row as `approved`.

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

Run reviewed SQL migrations against the same Postgres database before deploying, or let the production `start` script apply any pending migrations automatically:

1. `migrations/001_create_pending_submissions.sql`
2. `migrations/002_rebuild_foundation.sql`
3. `migrations/003_ugly_city_metadata.sql`
4. `migrations/004_repair_submission_schema_drift.sql`

Migration 003 adds nullable milestone metadata to pending submissions and the live image table. The app still preserves the core live insert contract: `image_url`, `user_id`, `added_by`, `created_at`, `era_keys`, `reward_points`, and `prompt_text`.
Migration 004 repeats the additive column/table guarantees from 002 and 003 for databases whose migration ledger was marked applied but whose schema drifted.

## Checks

```bash
npm run test:all
npm run check:mint
```

Integration tests require a disposable PostgreSQL database in `TEST_DATABASE_URL`. The test harness refuses production-looking database names and never falls back to `DATABASE_URL`.

Node.js 24 LTS is the target runtime for the rebuild. The current foundation still supports the existing Node 18+ baseline until the planned TypeScript/Express migration.

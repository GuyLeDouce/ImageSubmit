# Current Contract

Baseline reviewed: `5dd5323a7a0783bd4bfb288e499ab6a38dff4e1d`.

## Routes

Preserved route surface:

- `GET /`
- `GET /auth/discord`
- `GET /auth/discord/callback`
- `POST /logout`
- `GET /submit`
- `POST /submit`
- `GET /admin`
- `POST /admin/submissions/:id/approve`
- `POST /admin/submissions/:id/decline`
- `POST /admin/submissions/:id/update-approved`

The Discord OAuth callback path is externally configured and must not move without a tested redirect.

## Session And Auth

- Cookie name: `squig.submit.sid`.
- Discord OAuth scopes: `identify guilds`.
- Session user snapshot stores Discord ID, username, display name, avatar, membership boolean, and membership check time.
- Submit access requires current session user and guild membership.
- Admin access requires guild membership and `ADMIN_DISCORD_IDS`.

## Tables

Existing data must remain readable:

- `squig_survival_image_submissions`
- `squig_survival_image_approval_notifications`
- configured session table, default `session`
- configured live image table, default `squig_survival_images`

Application startup is now read-only against schema. Apply migrations explicitly before boot.

## Approval Contract

Approval must run in one database transaction:

1. Lock the pending submission.
2. Insert a compatible live row into `LIVE_IMAGE_TABLE` using `image_url`, `user_id`, `added_by`, `created_at`, `era_keys`, `reward_points`, and `prompt_text`.
3. Insert one approval notification intent.
4. Mark the submission approved.
5. Roll back all database writes on any failure.

## Era Keys

Stored era keys are integration identifiers and must remain exact:

- `day_one`
- `office_squigs`
- `jobsite_squigs`
- `movie_theater`
- `airport`
- `zombie_apocalypse`
- `!revive Success`
- `!revive Failed`

## Factory Era Catalog And Eligibility

Current rules supersede the historical baseline above:

- `src/eraCatalog.js` defines configured eras, descriptions, milestone metadata, and submission availability.
- `ugly_city` remains the first open era, with unchanged milestone identifiers.
- Legacy era keys remain available for admin repair; they are not automatically reopened.
- Every new submission requires at least one Squig. The default reward is 100 $CHARM.
- Moderators can approve pending images for a configured era even after its submission window closes.
- Approval writes the selected era to the live image row and notification; it never forces `ugly_city`.
- Existing routes, session identity, database columns, and transactional moderation remain unchanged.

See [Era setup](ERAS.md) for the configuration format and The Gauntlet handoff.

## External Links

Project links are centralized in `src/links.js`.

- Squigs home: `https://squigs.io/`
- Discord: `https://squigs.io/discord`
- OpenSea: `https://opensea.io/collection/squigs-reloaded`
- X: `https://x.com/SquigsNFT`

Obsolete mint URL and CTA copy are blocked by `npm run check:mint`.

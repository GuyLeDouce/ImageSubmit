# Data Preservation

This rebuild is preservation-first. Do not rename, drop, truncate, rewrite, or repurpose existing production tables, rows, `image_url` values, `storage_key` values, era keys, or notification records.

## Preflight

Run:

```bash
npm run db:preflight
```

The command opens a read-only transaction, introspects table definitions, indexes, constraints, row counts, invalid era keys, notification counts, duplicate notification intents, and malformed submission image URLs, then writes a JSON report under `preflight-reports/`.

The command does not apply DDL or DML.

## Backup And Rehearsal

Before any production migration:

1. Take a restorable Postgres backup.
2. Export object-storage inventory.
3. Clone production data into staging.
4. Run `npm run db:preflight` against the clone.
5. Apply forward-only migrations to the clone.
6. Run contract tests and a manual The Gauntlet compatibility check.
7. Compare before/after row counts and preflight reports.
8. Obtain owner approval before any migration that touches the live bot table.

## Live Table Rule

Do not alter `LIVE_IMAGE_TABLE` automatically. If a stable primary key exists, a later reviewed migration may add a nullable compatible `live_image_id` column to submissions and backfill only unambiguous records. If the live table has no stable key, produce a migration proposal instead of guessing.

## Rollback

Rollback the application release first. Do not run destructive down migrations during incident response. Because migrations must be additive in the first release, old code should remain able to read the original tables and columns.

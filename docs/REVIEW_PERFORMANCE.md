# Review Performance Upgrade

## Symptoms and root causes

The old `GET /admin` loaded all pending, approved and declined submissions on each request and rendered every collapsed moderation form. Each form also contained multiple milestone options and image elements. As the library grew, server rendering, HTML transfer, image decoding and browser layout all grew with the full archive. The now-retired GIF feature used a canvas encoder in the browser main thread and could cause long pauses.

Railway's old startup log reported Node 18.20.8 and an AWS SDK v3 compatibility warning. The migrations were already applied successfully; the log is not evidence of a database outage.

## Changes

- `GET /admin?status=pending|approved|declined&page=N` serves one queue and one **24-item** page. The other queues do not render.
- Count totals are still read from the complete submission table. Pages have stable ordering, bounded SQL parameters, and Previous/Next navigation.
- Homepage and no-history profile fallbacks request only 8 approved examples directly from SQL, instead of loading the entire approved list and slicing in memory.
- Moderation submissions retain all edit/approve/decline/unapprove routes, CSRF protection, row version conflict handling, and transaction boundaries.
- GIF creation (including button, encoder and `/admin/image-proxy`) has been fully removed. The remaining admin JavaScript only manages review form toggles and era/milestone inputs.
- New migration `006_moderation_pagination_indexes.sql` is additive and does not alter user data.
- `package.json`, `package-lock.json`, and `.node-version` request Node 24 for the next Railway build.

## How to check on Railway

1. Merge the PR only after GitHub checks and a desktop/mobile review. The application will apply migration 006 on first deployment and skip migrations 001–005.
2. Look for `[SUBMISSION-APP] Admin pending page 1: N rows in Xms` in the logs when opening the review page.
3. Check that the service is running on Node 24. If Railway still reports v18, update its Node version override (for example, `NIXPACKS_NODE_VERSION` or `RAILPACK_NODE_VERSION`) to 24 and rebuild; custom Docker images may need an updated base image.
4. Verify Pending/Approved/Declined tabs and Next/Previous, including late pages with few results.
5. Approve/decline a safe test submission and edit/unapprove previously reviewed submissions. Verify the edited records are correctly attributed in The Gauntlet.
6. Verify large image collections no longer freeze when switching review tabs. If delays continue, compare the logged SQL/render time with browser network waterfall and image decode time.

## Scope and rollback

No live database credentials were read or changed. No existing submissions are removed. To roll back, redeploy the previous commit; the additive indexes may safely remain in the database. All routes other than the unused GIF image-proxy route remain compatible.

# Squig Survival Image Factory: era setup

`src/eraCatalog.js` is the Image Factory's era catalog. Ugly City is one entry; its existing `ugly_city` key, 100 milestone keys/numbers, prompts, and `MILESTONES_ALLOWED` window remain intact. No database migration or existing-row rewrite is needed for this refactor.

## Add an era

Agree the exact era key and milestone identifiers with The Gauntlet first, then add an entry:

```js
{
  key: "your_era_key",
  label: "Your Era Name",
  description: "The creative brief for this world.",
  acceptingSubmissions: false,
  submissionMilestoneLimit: 1, // optional: first N milestones open for submissions
  milestones: [
    {
      key: "opening_scene",
      number: 1,
      label: "Chapter 1 - Opening Scene",
      district: "Opening Scene", // compatibility column; any scene/location label
      concept: "What creators should show in this scene.",
    },
  ],
}
```

Use stable lowercase underscore-separated keys. Keys must be unique per catalog, and milestone keys and positive integer numbers must be unique within an era. Different eras may share a milestone key. An empty `milestones` array supports era-wide images without chapter metadata; confirm the bot supports this before opening submissions.

Set `acceptingSubmissions: true` when ready. Closed eras remain available for moderation and repairs, but reject new uploads. Use a submission limit of zero to pause an era's milestone uploads. `MILESTONES_ALLOWED` applies only to Ugly City; other eras use their own optional limit. Catalog changes require an application restart/deployment. This release does not add a database-backed era editor.

## What updates automatically

- Home-page era cards and creator era selection.
- Era-specific brief, chapter list, and concept guidance.
- Server-side era/milestone eligibility checks before storing uploads.
- Approval and repair era/milestone controls.
- Era labels in creator history; unknown historical keys remain visible.

Every new image must still contain a Squig. The current default reward remains 100 $CHARM, with existing admin reward overrides. This change does not alter payout behavior.

## The Gauntlet handoff

This catalog does not automatically configure The Gauntlet. For each new era, update both repositories using the same era key and milestone keys/numbers. Verify the bot selects images by the era and milestone together, and understands null milestone metadata if used.

Approvals retain the existing live-table columns (`era_keys`, `milestone_key`, `milestone_number`, `milestone_label`, `milestone_district`, image URL, reward, and creator attribution) and approval-notification transaction. Review a test approval in staging and confirm that the bot selects it only for the intended era/milestone before opening a new era publicly.

Do not rename integration keys to change display copy. Keep retired eras in the catalog with `acceptingSubmissions: false`. Legacy eras remain repair-only until explicitly configured. No existing era is reopened by this release.

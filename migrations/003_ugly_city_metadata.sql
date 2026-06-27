-- Ugly City-only metadata for milestone-based submissions.
-- This is additive so existing submissions and live rows remain intact.

ALTER TABLE squig_survival_image_submissions
  ADD COLUMN IF NOT EXISTS milestone_key TEXT,
  ADD COLUMN IF NOT EXISTS milestone_number INTEGER,
  ADD COLUMN IF NOT EXISTS milestone_label TEXT,
  ADD COLUMN IF NOT EXISTS milestone_district TEXT,
  ADD COLUMN IF NOT EXISTS contains_squig_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_collections_text TEXT;

CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_milestone
  ON squig_survival_image_submissions (milestone_key, submitted_at DESC);

DO $$
BEGIN
  IF to_regclass('squig_survival_images') IS NOT NULL THEN
    ALTER TABLE squig_survival_images
      ADD COLUMN IF NOT EXISTS milestone_key TEXT,
      ADD COLUMN IF NOT EXISTS milestone_number INTEGER,
      ADD COLUMN IF NOT EXISTS milestone_label TEXT,
      ADD COLUMN IF NOT EXISTS milestone_district TEXT;

    CREATE INDEX IF NOT EXISTS idx_squig_survival_images_milestone
      ON squig_survival_images (milestone_key, created_at DESC);
  ELSE
    RAISE NOTICE 'Live image table squig_survival_images was not found; skipping optional Ugly City live-table metadata columns.';
  END IF;
END $$;

-- Force a repair pass against the exact tables resolved by the app's search_path.
-- This exists for production databases whose migration ledger recorded 004
-- but where runtime SELECTs still report missing additive columns.

DO $$
DECLARE
  submissions_table regclass := to_regclass('squig_survival_image_submissions');
  notifications_table regclass := to_regclass('squig_survival_image_approval_notifications');
  live_table regclass := to_regclass('squig_survival_images');
BEGIN
  IF submissions_table IS NULL THEN
    RAISE EXCEPTION 'Required table squig_survival_image_submissions was not found.';
  END IF;

  IF notifications_table IS NULL THEN
    RAISE EXCEPTION 'Required table squig_survival_image_approval_notifications was not found.';
  END IF;

  EXECUTE format(
    'ALTER TABLE %s
      ADD COLUMN IF NOT EXISTS decline_reason TEXT,
      ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS content_hash TEXT,
      ADD COLUMN IF NOT EXISTS live_image_id TEXT,
      ADD COLUMN IF NOT EXISTS milestone_key TEXT,
      ADD COLUMN IF NOT EXISTS milestone_number INTEGER,
      ADD COLUMN IF NOT EXISTS milestone_label TEXT,
      ADD COLUMN IF NOT EXISTS milestone_district TEXT,
      ADD COLUMN IF NOT EXISTS contains_squig_confirmed BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS other_collections_text TEXT',
    submissions_table
  );

  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS prompt_text TEXT',
    notifications_table
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_milestone
      ON %s (milestone_key, submitted_at DESC)',
    submissions_table
  );

  IF live_table IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %s
        ADD COLUMN IF NOT EXISTS milestone_key TEXT,
        ADD COLUMN IF NOT EXISTS milestone_number INTEGER,
        ADD COLUMN IF NOT EXISTS milestone_label TEXT,
        ADD COLUMN IF NOT EXISTS milestone_district TEXT',
      live_table
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_squig_survival_images_milestone
        ON %s (milestone_key, created_at DESC)',
      live_table
    );
  END IF;
END $$;

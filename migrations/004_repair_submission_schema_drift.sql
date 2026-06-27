-- Repair migration for databases whose migration ledger says 002/003 ran
-- but whose additive columns are missing. Every operation is idempotent.

CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

ALTER TABLE squig_survival_image_approval_notifications
  ADD COLUMN IF NOT EXISTS prompt_text TEXT;

ALTER TABLE squig_survival_image_submissions
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS live_image_id TEXT,
  ADD COLUMN IF NOT EXISTS milestone_key TEXT,
  ADD COLUMN IF NOT EXISTS milestone_number INTEGER,
  ADD COLUMN IF NOT EXISTS milestone_label TEXT,
  ADD COLUMN IF NOT EXISTS milestone_district TEXT,
  ADD COLUMN IF NOT EXISTS contains_squig_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_collections_text TEXT;

CREATE TABLE IF NOT EXISTS squig_survival_image_moderation_audit (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT,
  action TEXT NOT NULL,
  actor_discord_id TEXT,
  actor_display_snapshot TEXT,
  before_json JSONB,
  after_json JSONB,
  request_id TEXT,
  reason TEXT,
  outcome TEXT NOT NULL DEFAULT 'success',
  live_image_ref TEXT,
  notification_ref BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squig_survival_image_moderation_audit_submission
  ON squig_survival_image_moderation_audit (submission_id, created_at DESC);

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

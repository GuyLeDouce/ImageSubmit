-- Foundation migration for the Squigs Reloaded Creator Portal rebuild.
-- This migration is intentionally additive and does not alter The Gauntlet live table.

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
  ADD COLUMN IF NOT EXISTS live_image_id TEXT;

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

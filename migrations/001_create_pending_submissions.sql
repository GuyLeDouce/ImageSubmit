-- Pending moderation queue for Squig Survival image submissions.
-- This intentionally does not modify the live bot table beyond inserting approved rows.

CREATE TABLE IF NOT EXISTS squig_survival_image_submissions (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_display_name TEXT,
  era_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_key TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_points INTEGER NOT NULL DEFAULT 100,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  CONSTRAINT squig_survival_image_submissions_status_check
    CHECK (status IN ('pending', 'approved', 'declined'))
);

CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_status
  ON squig_survival_image_submissions (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_user
  ON squig_survival_image_submissions (discord_user_id, submitted_at DESC);

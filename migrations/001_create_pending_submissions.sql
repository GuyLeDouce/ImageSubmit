-- Pending moderation queue for Squig Survival image submissions.
-- This intentionally does not modify the live bot table beyond inserting approved rows.

CREATE TABLE IF NOT EXISTS squig_survival_image_submissions (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_display_name TEXT,
  era_key TEXT NOT NULL,
  prompt_text TEXT,
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

ALTER TABLE squig_survival_image_submissions
  ADD COLUMN IF NOT EXISTS prompt_text TEXT;

CREATE TABLE IF NOT EXISTS squig_survival_image_approval_notifications (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  era_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 100,
  approved_by TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  post_status TEXT NOT NULL DEFAULT 'pending',
  post_attempts INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  posted_message_id TEXT,
  post_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT squig_survival_image_approval_notifications_status_check
    CHECK (post_status IN ('pending', 'processing', 'posted', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_squig_survival_image_approval_notifications_status
  ON squig_survival_image_approval_notifications (post_status, approved_at ASC);

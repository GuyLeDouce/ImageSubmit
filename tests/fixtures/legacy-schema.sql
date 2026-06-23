CREATE TABLE squig_survival_images (
  id BIGSERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  user_id TEXT NOT NULL,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  era_keys TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 100,
  prompt_text TEXT
);

CREATE TABLE squig_survival_image_submissions (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_display_name TEXT,
  era_key TEXT NOT NULL,
  prompt_text TEXT,
  nft_used_type TEXT NOT NULL DEFAULT 'squigs',
  nft_used_text TEXT,
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

CREATE INDEX idx_squig_survival_image_submissions_status
  ON squig_survival_image_submissions (status, submitted_at DESC);

CREATE INDEX idx_squig_survival_image_submissions_user
  ON squig_survival_image_submissions (discord_user_id, submitted_at DESC);

CREATE TABLE squig_survival_image_approval_notifications (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  era_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt_text TEXT,
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

CREATE INDEX idx_squig_survival_image_approval_notifications_status
  ON squig_survival_image_approval_notifications (post_status, approved_at ASC);

CREATE TABLE session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX idx_session_expire ON session (expire);

INSERT INTO squig_survival_image_submissions (
  id, discord_user_id, discord_username, discord_display_name, era_key, prompt_text,
  nft_used_type, nft_used_text, image_url, storage_key, mime_type, size_bytes,
  status, reward_points, submitted_at, reviewed_at, reviewed_by
) VALUES
  (101, '111111111111111111', 'pending_user', 'Pending User', 'day_one', 'pending prompt',
   'squigs', NULL, 'https://cdn.example.test/pending.png', 'legacy/pending.png', 'image/png', 1234,
   'pending', 150, '2025-01-01T00:00:00Z', NULL, NULL),
  (102, '222222222222222222', 'approved_user', 'Approved User', 'airport', 'approved prompt',
   'other', 'Other NFT', 'https://cdn.example.test/approved.webp', 'legacy/approved.webp', 'image/webp', 2345,
   'approved', 100, '2025-01-02T00:00:00Z', '2025-01-03T00:00:00Z', 'mod (999999999999999999)'),
  (103, '333333333333333333', 'declined_user', 'Declined User', '!revive Failed', 'declined prompt',
   'squigs', NULL, 'https://cdn.example.test/declined.gif', 'legacy/declined.gif', 'image/gif', 3456,
   'declined', 20, '2025-01-04T00:00:00Z', '2025-01-05T00:00:00Z', 'mod (999999999999999999)');

INSERT INTO squig_survival_images (
  id, image_url, user_id, added_by, created_at, era_keys, reward_points, prompt_text
) VALUES (
  501, 'https://cdn.example.test/approved.webp', '222222222222222222', 'mod (999999999999999999)',
  '2025-01-03T00:00:00Z', 'airport', 100, 'approved prompt'
);

INSERT INTO squig_survival_image_approval_notifications (
  id, submission_id, discord_user_id, discord_username, era_key, image_url, prompt_text,
  reward_points, approved_by, approved_at, post_status
) VALUES (
  601, 102, '222222222222222222', 'approved_user', 'airport',
  'https://cdn.example.test/approved.webp', 'approved prompt', 100,
  'mod (999999999999999999)', '2025-01-03T00:00:00Z', 'pending'
);

INSERT INTO session (sid, sess, expire)
VALUES ('legacy-session', '{"cookie":{"originalMaxAge":60000}}', now() + interval '1 hour');

SELECT setval('squig_survival_image_submissions_id_seq', 1000, true);
SELECT setval('squig_survival_images_id_seq', 1000, true);
SELECT setval('squig_survival_image_approval_notifications_id_seq', 1000, true);

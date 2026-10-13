-- Support bounded moderation queries with deterministic ordering.
-- Additive indexes only: no data rewrites, updates, or dropped tables.

CREATE INDEX IF NOT EXISTS idx_squig_survival_submissions_pending_page
  ON squig_survival_image_submissions (status, submitted_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_squig_survival_submissions_review_page
  ON squig_survival_image_submissions (
    status,
    reviewed_at DESC NULLS LAST,
    submitted_at DESC,
    id DESC
  );

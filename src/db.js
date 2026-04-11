const { Pool } = require("pg");
const { config, getSSL } = require("./config");

function log(...args) {
  console.log("[SUBMISSION-DB]", ...args);
}

const liveTableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
if (!liveTableRegex.test(config.liveImageTable)) {
  throw new Error(`Unsafe LIVE_IMAGE_TABLE value: ${config.liveImageTable}`);
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: getSSL(config.databaseUrl),
});

pool.on("error", (err) => {
  log("Postgres pool error (continuing):", err?.message || err);
});

async function initDb() {
  await pool.query("SELECT 1");

  const liveTableCheck = await pool.query(
    "SELECT to_regclass($1) AS table_name",
    [config.liveImageTable]
  );

  if (!liveTableCheck.rows[0]?.table_name) {
    throw new Error(
      `Live image table '${config.liveImageTable}' was not found. Point this app at the same Postgres database used by The Gauntlet.`
    );
  }

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_status
      ON squig_survival_image_submissions (status, submitted_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_squig_survival_image_submissions_user
      ON squig_survival_image_submissions (discord_user_id, submitted_at DESC);
  `);
  await pool.query(`
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
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_squig_survival_image_approval_notifications_status
      ON squig_survival_image_approval_notifications (post_status, approved_at ASC);
  `);

  log("Database ready.");
}

async function createPendingSubmission(input) {
  const result = await pool.query(
    `
      INSERT INTO squig_survival_image_submissions (
        discord_user_id,
        discord_username,
        discord_display_name,
        era_key,
        image_url,
        storage_key,
        mime_type,
        size_bytes,
        reward_points
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 100)
      RETURNING id, submitted_at
    `,
    [
      input.discordUserId,
      input.discordUsername,
      input.discordDisplayName,
      input.eraKey,
      input.imageUrl,
      input.storageKey,
      input.mimeType,
      input.sizeBytes,
    ]
  );

  return result.rows[0];
}

async function listPendingSubmissions() {
  const result = await pool.query(`
    SELECT
      id,
      discord_user_id,
      discord_username,
      discord_display_name,
      era_key,
      image_url,
      storage_key,
      mime_type,
      size_bytes,
      status,
      reward_points,
      submitted_at,
      reviewed_at,
      reviewed_by
    FROM squig_survival_image_submissions
    WHERE status = 'pending'
    ORDER BY submitted_at ASC
  `);

  return result.rows;
}

async function approveSubmission({ submissionId, rewardPoints, reviewedBy }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pending = await client.query(
      `
        SELECT *
        FROM squig_survival_image_submissions
        WHERE id = $1
        FOR UPDATE
      `,
      [submissionId]
    );

    const submission = pending.rows[0];
    if (!submission) throw new Error("Submission not found.");
    if (submission.status !== "pending") {
      throw new Error(`Submission is already ${submission.status}.`);
    }

    await client.query(
      `
        INSERT INTO ${config.liveImageTable} (
          image_url,
          user_id,
          added_by,
          created_at,
          era_keys,
          reward_points
        )
        VALUES ($1, $2, $3, now(), $4, $5)
      `,
      [submission.image_url, submission.discord_user_id, reviewedBy, submission.era_key, rewardPoints]
    );

    await client.query(
      `
        INSERT INTO squig_survival_image_approval_notifications (
          submission_id,
          discord_user_id,
          discord_username,
          era_key,
          image_url,
          reward_points,
          approved_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        submission.id,
        submission.discord_user_id,
        submission.discord_username,
        submission.era_key,
        submission.image_url,
        rewardPoints,
        reviewedBy,
      ]
    );

    const updated = await client.query(
      `
        UPDATE squig_survival_image_submissions
        SET status = 'approved', reward_points = $2, reviewed_at = now(), reviewed_by = $3
        WHERE id = $1
        RETURNING id, reviewed_at
      `,
      [submissionId, rewardPoints, reviewedBy]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function declineSubmission({ submissionId, reviewedBy }) {
  const result = await pool.query(
    `
      UPDATE squig_survival_image_submissions
      SET status = 'declined', reviewed_at = now(), reviewed_by = $2
      WHERE id = $1 AND status = 'pending'
      RETURNING id, reviewed_at
    `,
    [submissionId, reviewedBy]
  );

  if (!result.rows[0]) {
    throw new Error("Submission not found or already reviewed.");
  }

  return result.rows[0];
}

module.exports = {
  pool,
  initDb,
  createPendingSubmission,
  listPendingSubmissions,
  approveSubmission,
  declineSubmission,
};

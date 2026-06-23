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
  for (const tableName of [
    "squig_survival_image_submissions",
    "squig_survival_image_approval_notifications",
    config.sessionTable,
  ]) {
    const tableCheck = await pool.query("SELECT to_regclass($1) AS table_name", [tableName]);
    if (!tableCheck.rows[0]?.table_name) {
      throw new Error(`Required table '${tableName}' was not found. Run reviewed migrations before starting the app.`);
    }
  }

  log("Database reachable and required tables present.");
}

async function createPendingSubmission(input) {
  const result = await pool.query(
    `
      INSERT INTO squig_survival_image_submissions (
        discord_user_id,
        discord_username,
        discord_display_name,
        era_key,
        prompt_text,
        nft_used_type,
        nft_used_text,
        image_url,
        storage_key,
        mime_type,
        size_bytes,
        reward_points
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, submitted_at
    `,
    [
      input.discordUserId,
      input.discordUsername,
      input.discordDisplayName,
      input.eraKey,
      input.promptText,
      input.nftUsedType,
      input.nftUsedText,
      input.imageUrl,
      input.storageKey,
      input.mimeType,
      input.sizeBytes,
      input.rewardPoints,
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
      prompt_text,
      nft_used_type,
      nft_used_text,
      image_url,
      storage_key,
      mime_type,
      size_bytes,
      status,
      reward_points,
      submitted_at,
      reviewed_at,
      reviewed_by,
      decline_reason,
      row_version
    FROM squig_survival_image_submissions
    WHERE status = 'pending'
    ORDER BY submitted_at ASC
  `);

  return result.rows;
}

async function listApprovedSubmissions() {
  const result = await pool.query(`
    SELECT
      id,
      discord_user_id,
      discord_username,
      discord_display_name,
      era_key,
      prompt_text,
      nft_used_type,
      nft_used_text,
      image_url,
      storage_key,
      mime_type,
      size_bytes,
      status,
      reward_points,
      submitted_at,
      reviewed_at,
      reviewed_by,
      decline_reason,
      row_version
    FROM squig_survival_image_submissions
    WHERE status = 'approved'
    ORDER BY reviewed_at DESC NULLS LAST, submitted_at DESC
  `);

  return result.rows;
}

async function listSubmissionsForUser(discordUserId) {
  const result = await pool.query(
    `
      SELECT
        id,
        discord_user_id,
        discord_username,
        discord_display_name,
        era_key,
        prompt_text,
        nft_used_type,
        nft_used_text,
        image_url,
        storage_key,
        mime_type,
        size_bytes,
        status,
        reward_points,
        submitted_at,
        reviewed_at,
        reviewed_by,
        decline_reason,
        row_version
      FROM squig_survival_image_submissions
      WHERE discord_user_id = $1
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'declined' THEN 2
          ELSE 3
        END,
        COALESCE(reviewed_at, submitted_at) DESC,
        submitted_at DESC
    `,
    [discordUserId]
  );

  return result.rows;
}

async function approveSubmission({
  submissionId,
  rewardPoints,
  reviewedBy,
  overrideDiscordUserId,
  overrideDiscordUsername,
  overrideDiscordDisplayName,
  overrideEraKey,
  overrideNftUsedType,
  overrideNftUsedText,
}) {
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

    const resolvedDiscordUserId = overrideDiscordUserId || submission.discord_user_id;
    const resolvedDiscordUsername = overrideDiscordUsername || submission.discord_username;
    const resolvedDiscordDisplayName =
      overrideDiscordDisplayName || submission.discord_display_name;
    const resolvedEraKey = overrideEraKey || submission.era_key;
    const resolvedNftUsedType = overrideNftUsedType || submission.nft_used_type;
    const resolvedNftUsedText =
      resolvedNftUsedType === "other" ? overrideNftUsedText || submission.nft_used_text : null;

    await client.query(
      `
        UPDATE squig_survival_image_submissions
        SET discord_user_id = $2,
            discord_username = $3,
            discord_display_name = $4,
            era_key = $5,
            nft_used_type = $6,
            nft_used_text = $7
        WHERE id = $1
      `,
      [
        submissionId,
        resolvedDiscordUserId,
        resolvedDiscordUsername,
        resolvedDiscordDisplayName,
        resolvedEraKey,
        resolvedNftUsedType,
        resolvedNftUsedText,
      ]
    );

    await client.query(
      `
        INSERT INTO ${config.liveImageTable} (
          image_url,
          user_id,
          added_by,
          created_at,
          era_keys,
          reward_points,
          prompt_text
        )
        VALUES ($1, $2, $3, now(), $4, $5, $6)
      `,
      [
        submission.image_url,
        resolvedDiscordUserId,
        reviewedBy,
        resolvedEraKey,
        rewardPoints,
        submission.prompt_text,
      ]
    );

    await client.query(
      `
        INSERT INTO squig_survival_image_approval_notifications (
          submission_id,
          discord_user_id,
          discord_username,
          era_key,
          image_url,
          prompt_text,
          reward_points,
          approved_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        submission.id,
        resolvedDiscordUserId,
        resolvedDiscordUsername,
        resolvedEraKey,
        submission.image_url,
        submission.prompt_text,
        rewardPoints,
        reviewedBy,
      ]
    );

    const updated = await client.query(
      `
        UPDATE squig_survival_image_submissions
        SET status = 'approved',
            reward_points = $2,
            nft_used_type = $4,
            nft_used_text = $5,
            reviewed_at = now(),
            reviewed_by = $3,
            row_version = row_version + 1
        WHERE id = $1
        RETURNING id, reviewed_at, discord_user_id
      `,
      [submissionId, rewardPoints, reviewedBy, resolvedNftUsedType, resolvedNftUsedText]
    );

    await client.query(
      `
        INSERT INTO squig_survival_image_moderation_audit (
          submission_id,
          action,
          actor_display_snapshot,
          after_json,
          outcome
        )
        VALUES ($1, 'approve', $2, to_jsonb($3::json), 'success')
      `,
      [
        submissionId,
        reviewedBy,
        JSON.stringify({
          discordUserId: resolvedDiscordUserId,
          eraKey: resolvedEraKey,
          rewardPoints,
        }),
      ]
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

async function declineSubmission({ submissionId, reviewedBy, reason }) {
  const result = await pool.query(
    `
      WITH updated AS (
        UPDATE squig_survival_image_submissions
        SET status = 'declined',
            reviewed_at = now(),
            reviewed_by = $2,
            decline_reason = $3,
            row_version = row_version + 1
        WHERE id = $1 AND status = 'pending'
        RETURNING id, reviewed_at
      ),
      audit AS (
        INSERT INTO squig_survival_image_moderation_audit (
          submission_id,
          action,
          actor_display_snapshot,
          reason,
          outcome
        )
        SELECT id, 'decline', $2, $3, 'success'
        FROM updated
      )
      SELECT * FROM updated
    `,
    [submissionId, reviewedBy, reason]
  );

  if (!result.rows[0]) {
    throw new Error("Submission not found or already reviewed.");
  }

  return result.rows[0];
}

async function updateApprovedSubmission({
  submissionId,
  rewardPoints,
  reviewedBy,
  overrideDiscordUserId,
  overrideDiscordUsername,
  overrideDiscordDisplayName,
  overrideEraKey,
  overrideNftUsedType,
  overrideNftUsedText,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query(
      `
        SELECT *
        FROM squig_survival_image_submissions
        WHERE id = $1
        FOR UPDATE
      `,
      [submissionId]
    );

    const submission = currentResult.rows[0];
    if (!submission) throw new Error("Approved submission not found.");
    if (submission.status !== "approved") {
      throw new Error("Only approved submissions can be edited here.");
    }

    const resolvedDiscordUserId = overrideDiscordUserId || submission.discord_user_id;
    const resolvedDiscordUsername = overrideDiscordUsername || submission.discord_username;
    const resolvedDiscordDisplayName =
      overrideDiscordDisplayName || submission.discord_display_name;
    const resolvedEraKey = overrideEraKey || submission.era_key;
    const resolvedNftUsedType = overrideNftUsedType || submission.nft_used_type;
    const resolvedNftUsedText =
      resolvedNftUsedType === "other" ? overrideNftUsedText || submission.nft_used_text : null;

    const liveUpdate = await client.query(
      `
        UPDATE ${config.liveImageTable}
        SET user_id = $1,
            era_keys = $2,
            reward_points = $3,
            added_by = $4,
            prompt_text = $5
        WHERE image_url = $6
          AND user_id = $7
          AND era_keys = $8
          AND reward_points = $9
      `,
      [
        resolvedDiscordUserId,
        resolvedEraKey,
        rewardPoints,
        reviewedBy,
        submission.prompt_text,
        submission.image_url,
        submission.discord_user_id,
        submission.era_key,
        submission.reward_points,
      ]
    );

    if (liveUpdate.rowCount !== 1) {
      throw new Error("Could not safely update the live image row. No changes were saved.");
    }

    const updated = await client.query(
      `
        UPDATE squig_survival_image_submissions
        SET discord_user_id = $2,
            discord_username = $3,
            discord_display_name = $4,
            era_key = $5,
            reward_points = $6,
            nft_used_type = $7,
            nft_used_text = $8,
            reviewed_at = now(),
            reviewed_by = $9,
            row_version = row_version + 1
        WHERE id = $1
        RETURNING id, reviewed_at
      `,
      [
        submissionId,
        resolvedDiscordUserId,
        resolvedDiscordUsername,
        resolvedDiscordDisplayName,
        resolvedEraKey,
        rewardPoints,
        resolvedNftUsedType,
        resolvedNftUsedText,
        reviewedBy,
      ]
    );

    await client.query(
      `
        INSERT INTO squig_survival_image_moderation_audit (
          submission_id,
          action,
          actor_display_snapshot,
          after_json,
          outcome
        )
        VALUES ($1, 'update-approved', $2, to_jsonb($3::json), 'success')
      `,
      [
        submissionId,
        reviewedBy,
        JSON.stringify({
          discordUserId: resolvedDiscordUserId,
          eraKey: resolvedEraKey,
          rewardPoints,
        }),
      ]
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

module.exports = {
  pool,
  initDb,
  createPendingSubmission,
  listPendingSubmissions,
  listApprovedSubmissions,
  listSubmissionsForUser,
  approveSubmission,
  declineSubmission,
  updateApprovedSubmission,
};

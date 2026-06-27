const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const { createTestPool, resetDatabase, getTestDatabaseUrl } = require("./helpers/pg");

function configureEnv() {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.PGSSL = "false";
  process.env.SESSION_SECRET = "test-secret";
  process.env.DISCORD_CLIENT_ID = "client";
  process.env.DISCORD_CLIENT_SECRET = "secret";
  process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/auth/discord/callback";
  process.env.DISCORD_GUILD_ID = "guild";
  process.env.ADMIN_DISCORD_IDS = "999999999999999999";
  process.env.PUBLIC_BASE_URL = "http://localhost:3000";
  process.env.STORAGE_DRIVER = "local";
  process.env.LIVE_IMAGE_TABLE = "squig_survival_images";
}

function loadDb() {
  configureEnv();
  for (const key of ["../src/db", "../src/config", "../src/errors"]) {
    delete require.cache[require.resolve(key)];
  }
  return require("../src/db");
}

function runMigrate() {
  return spawnSync(process.execPath, ["scripts/migrate.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DATABASE_URL: "",
      TEST_DATABASE_URL: getTestDatabaseUrl(),
      SESSION_SECRET: "test-secret",
      DISCORD_CLIENT_ID: "client",
      DISCORD_CLIENT_SECRET: "secret",
      DISCORD_REDIRECT_URI: "http://localhost:3000/auth/discord/callback",
      DISCORD_GUILD_ID: "guild",
      PGSSL: "false",
    },
    encoding: "utf8",
  });
}

async function prepareLegacyMigratedDb() {
  const pool = createTestPool();
  await resetDatabase(pool);
  await pool.query(fs.readFileSync(path.join(__dirname, "fixtures", "legacy-schema.sql"), "utf8"));
  const migration = runMigrate();
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  return pool;
}

async function counts(pool) {
  const [submissions, live, notifications, audit] = await Promise.all([
    pool.query("SELECT id, status, row_version, decline_reason FROM squig_survival_image_submissions ORDER BY id"),
    pool.query("SELECT image_url, user_id, era_keys, reward_points FROM squig_survival_images ORDER BY id"),
    pool.query("SELECT submission_id, image_url, post_status FROM squig_survival_image_approval_notifications ORDER BY id"),
    pool.query("SELECT submission_id, action, actor_discord_id, request_id, before_json, after_json, reason, outcome FROM squig_survival_image_moderation_audit ORDER BY id"),
  ]);
  return { submissions: submissions.rows, live: live.rows, notifications: notifications.rows, audit: audit.rows };
}

test("approval transaction commits live row, notification, submission update, and audit together", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareLegacyMigratedDb();
  const db = loadDb();
  await db.approveSubmission({
    submissionId: 101,
    rewardPoints: 150,
    reviewedBy: "mod (999999999999999999)",
    overrideEraKey: "day_one",
    overrideNftUsedType: "squigs",
    expectedRowVersion: 1,
    actorDiscordId: "999999999999999999",
    requestId: "req-approve",
  });
  const state = await counts(pool);
  assert.equal(state.submissions.find((row) => Number(row.id) === 101).status, "approved");
  assert.equal(state.submissions.find((row) => Number(row.id) === 101).row_version, 2);
  assert.ok(state.live.some((row) => row.image_url === "https://cdn.example.test/pending.png"));
  assert.ok(state.notifications.some((row) => Number(row.submission_id) === 101));
  const audit = state.audit.find((row) => Number(row.submission_id) === 101);
  assert.equal(audit.action, "approve");
  assert.equal(audit.actor_discord_id, "999999999999999999");
  assert.equal(audit.request_id, "req-approve");
  assert.ok(audit.before_json);
  assert.ok(audit.after_json);
  await db.pool.end();
  await pool.end();
});

test("approval failure injection rolls back every write position", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  for (const point of ["after-live-insert", "after-notification-insert", "after-submission-update", "after-audit-insert"]) {
    const pool = await prepareLegacyMigratedDb();
    const before = await counts(pool);
    const db = loadDb();
    await assert.rejects(
      db.approveSubmission({
        submissionId: 101,
        rewardPoints: 150,
        reviewedBy: "mod (999999999999999999)",
        overrideEraKey: "day_one",
        overrideNftUsedType: "squigs",
        expectedRowVersion: 1,
        actorDiscordId: "999999999999999999",
        requestId: `req-${point}`,
        injectFailureAt: point,
      }),
      /Injected failure/
    );
    const after = await counts(pool);
    assert.deepEqual(after, before, point);
    await db.pool.end();
    await pool.end();
  }
});

test("decline requires row version and rejects stale moderator action", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareLegacyMigratedDb();
  const db = loadDb();
  await db.declineSubmission({
    submissionId: 101,
    reviewedBy: "mod (999999999999999999)",
    reason: "Does not match the era.",
    expectedRowVersion: 1,
    actorDiscordId: "999999999999999999",
    requestId: "req-decline",
  });
  await assert.rejects(
    db.declineSubmission({
      submissionId: 101,
      reviewedBy: "second_mod (888888888888888888)",
      reason: "Stale action.",
      expectedRowVersion: 1,
      actorDiscordId: "888888888888888888",
      requestId: "req-stale",
    }),
    /already declined|changed/
  );
  const state = await counts(pool);
  const submission = state.submissions.find((row) => Number(row.id) === 101);
  assert.equal(submission.status, "declined");
  assert.equal(submission.row_version, 2);
  assert.equal(submission.decline_reason, "Does not match the era.");
  assert.equal(state.audit.filter((row) => Number(row.submission_id) === 101).length, 1);
  await db.pool.end();
  await pool.end();
});

test("approved edit rolls back live, notification, submission, and audit writes on injected failures", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  for (const point of ["after-live-update", "after-notification-update", "after-submission-update", "after-audit-insert"]) {
    const pool = await prepareLegacyMigratedDb();
    const before = await counts(pool);
    const db = loadDb();
    await assert.rejects(
      db.updateApprovedSubmission({
        submissionId: 102,
        rewardPoints: 150,
        reviewedBy: "mod (999999999999999999)",
        overrideDiscordUserId: "222222222222222222",
        overrideDiscordUsername: "approved_user",
        overrideDiscordDisplayName: "Approved User",
        overrideEraKey: "zombie_apocalypse",
        overrideNftUsedType: "squigs",
        expectedRowVersion: 1,
        actorDiscordId: "999999999999999999",
        requestId: `req-${point}`,
        injectFailureAt: point,
      }),
      /Injected failure/
    );
    const after = await counts(pool);
    assert.deepEqual(after, before, point);
    await db.pool.end();
    await pool.end();
  }
});

test("unapprove removes live row and marks approved submission declined", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareLegacyMigratedDb();
  const db = loadDb();
  await db.unapproveSubmission({
    submissionId: 102,
    reviewedBy: "mod (999999999999999999)",
    reason: "Legacy image should leave this pool.",
    expectedRowVersion: 1,
    actorDiscordId: "999999999999999999",
    requestId: "req-unapprove",
  });
  const state = await counts(pool);
  const submission = state.submissions.find((row) => Number(row.id) === 102);
  assert.equal(submission.status, "declined");
  assert.equal(submission.row_version, 2);
  assert.equal(submission.decline_reason, "Legacy image should leave this pool.");
  assert.equal(state.live.some((row) => row.image_url === "https://cdn.example.test/approved.webp"), false);
  const audit = state.audit.find((row) => Number(row.submission_id) === 102);
  assert.equal(audit.action, "unapprove");
  assert.equal(audit.reason, "Legacy image should leave this pool.");
  await db.pool.end();
  await pool.end();
});

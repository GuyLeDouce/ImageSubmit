const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const { createTestPool, resetDatabase, getTestDatabaseUrl } = require("./helpers/pg");

function runMigrate(extraEnv = {}) {
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
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

test("migration 002 preserves legacy rows and records execution", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = createTestPool();
  await resetDatabase(pool);
  await pool.query(fs.readFileSync(path.join(__dirname, "fixtures", "legacy-schema.sql"), "utf8"));

  const beforeSubmissions = await pool.query("SELECT id, era_key, image_url, storage_key FROM squig_survival_image_submissions ORDER BY id");
  const beforeLiveColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'squig_survival_images'
    ORDER BY ordinal_position
  `);

  const first = runMigrate();
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const second = runMigrate();
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(second.stdout, /"skipped"/);

  const afterSubmissions = await pool.query("SELECT id, era_key, image_url, storage_key, decline_reason, row_version FROM squig_survival_image_submissions ORDER BY id");
  assert.deepEqual(
    afterSubmissions.rows.map(({ id, era_key, image_url, storage_key }) => ({ id, era_key, image_url, storage_key })),
    beforeSubmissions.rows
  );
  assert.equal(afterSubmissions.rows.find((row) => row.id === "103" || row.id === 103).decline_reason, null);
  assert.deepEqual(afterSubmissions.rows.map((row) => row.row_version), [1, 1, 1]);

  const notification = await pool.query("SELECT id, submission_id, image_url, era_key FROM squig_survival_image_approval_notifications WHERE id = 601");
  assert.equal(String(notification.rows[0].submission_id), "102");
  assert.equal(notification.rows[0].image_url, "https://cdn.example.test/approved.webp");
  assert.equal(notification.rows[0].era_key, "airport");

  const afterLiveColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'squig_survival_images'
    ORDER BY ordinal_position
  `);
  assert.deepEqual(afterLiveColumns.rows, beforeLiveColumns.rows);

  const auditTable = await pool.query("SELECT to_regclass('squig_survival_image_moderation_audit') AS regclass");
  assert.equal(auditTable.rows[0].regclass, "squig_survival_image_moderation_audit");
  const ledger = await pool.query("SELECT filename FROM squig_survival_schema_migrations ORDER BY filename");
  assert.deepEqual(ledger.rows.map((row) => row.filename), ["001_create_pending_submissions.sql", "002_rebuild_foundation.sql"]);

  await pool.end();
});

test("failed migration rolls back safely", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = createTestPool();
  await resetDatabase(pool);
  const result = runMigrate({ INJECT_MIGRATION_FAILURE_AFTER: "001_create_pending_submissions.sql" });
  assert.notEqual(result.status, 0);
  const ledger = await pool.query("SELECT to_regclass('squig_survival_schema_migrations') AS regclass");
  assert.equal(ledger.rows[0].regclass, "squig_survival_schema_migrations");
  const rows = await pool.query("SELECT count(*)::int AS count FROM squig_survival_schema_migrations");
  assert.equal(rows.rows[0].count, 0);
  const submissions = await pool.query("SELECT to_regclass('squig_survival_image_submissions') AS regclass");
  assert.equal(submissions.rows[0].regclass, null);
  await pool.end();
});

test("migrations run from an empty development database", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = createTestPool();
  await resetDatabase(pool);
  const result = runMigrate();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const tableName of [
    "squig_survival_image_submissions",
    "squig_survival_image_approval_notifications",
    "squig_survival_image_moderation_audit",
    "session",
  ]) {
    const check = await pool.query("SELECT to_regclass($1) AS regclass", [tableName]);
    assert.equal(check.rows[0].regclass, tableName);
  }
  await pool.end();
});

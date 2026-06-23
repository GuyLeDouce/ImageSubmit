const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { createTestPool, resetDatabase, getTestDatabaseUrl } = require("./helpers/pg");

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

function configureEnv(databaseUrl) {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
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

function loadDb(databaseUrl) {
  configureEnv(databaseUrl);
  for (const key of ["../src/db", "../src/config", "../src/errors"]) {
    delete require.cache[require.resolve(key)];
  }
  return require("../src/db");
}

function withCredentials(rawUrl, user, password) {
  const parsed = new URL(rawUrl);
  parsed.username = user;
  parsed.password = password;
  return parsed.toString();
}

test("startup schema verification succeeds with a non-DDL role and fails safely when a table is missing", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = createTestPool();
  await resetDatabase(pool);
  const migration = runMigrate();
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);

  const role = `squigs_app_test_${Date.now()}`;
  const password = `pw_${Date.now()}`;
  await pool.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
  await pool.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
  await pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);

  const restrictedDb = loadDb(withCredentials(getTestDatabaseUrl(), role, password));
  await restrictedDb.initDb();
  await assert.rejects(restrictedDb.pool.query("CREATE TABLE should_not_work (id int)"), /permission denied|must be owner/i);
  await restrictedDb.pool.end();

  await pool.query("DROP TABLE squig_survival_image_approval_notifications");
  const missingTableDb = loadDb(withCredentials(getTestDatabaseUrl(), role, password));
  await assert.rejects(
    missingTableDb.initDb(),
    (error) => {
      assert.equal(error.name, "SafeStartupError");
      assert.doesNotMatch(error.message, /postgresql:\/\/|PASSWORD|SELECT|CREATE|ALTER|DROP/i);
      return true;
    }
  );
  await missingTableDb.pool.end();
  await pool.query(`DROP ROLE ${role}`);
  await pool.end();
});

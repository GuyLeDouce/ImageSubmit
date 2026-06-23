const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { createTestPool, resetDatabase, getTestDatabaseUrl } = require("./helpers/pg");
const { request, startServer } = require("./helpers/http");

function configureEnv(databaseUrl) {
  process.env.NODE_ENV = "test";
  process.env.ENABLE_TEST_AUTH = "true";
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

function loadApp(databaseUrl) {
  configureEnv(databaseUrl);
  for (const key of ["../src/app", "../src/db", "../src/config", "../src/errors"]) {
    delete require.cache[require.resolve(key)];
  }
  return require("../src/app").createApp();
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

test("health endpoints return safe statuses when PostgreSQL is healthy", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = createTestPool();
  await resetDatabase(pool);
  const migration = runMigrate();
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  const app = loadApp(getTestDatabaseUrl());
  const { server, baseUrl } = await startServer(app);
  const live = await request(baseUrl, { path: "/health/live" });
  const ready = await request(baseUrl, { path: "/health/ready" });
  assert.equal(live.statusCode, 200);
  assert.deepEqual(JSON.parse(live.body).status, "ok");
  assert.equal(ready.statusCode, 200);
  assert.deepEqual(JSON.parse(ready.body).status, "ready");
  server.close();
  await pool.end();
});

test("readiness returns 503 without exposing database details when PostgreSQL is unavailable", async () => {
  const app = loadApp("postgresql://test_user:test_password@127.0.0.1:1/squigs_unavailable_test");
  const { server, baseUrl } = await startServer(app);
  const live = await request(baseUrl, { path: "/health/live" });
  const ready = await request(baseUrl, { path: "/health/ready" });
  assert.equal(live.statusCode, 200);
  assert.equal(ready.statusCode, 503);
  assert.doesNotMatch(ready.body, /postgresql:\/\/|test_password|SELECT 1|ECONNREFUSED/i);
  server.close();
});

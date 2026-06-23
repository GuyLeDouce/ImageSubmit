const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const { createTestPool, resetDatabase, getTestDatabaseUrl } = require("./helpers/pg");
const { cookieHeader, extractCsrf, formBody, multipartBody, request, startServer } = require("./helpers/http");

function configureEnv(nodeEnv = "test") {
  process.env.NODE_ENV = nodeEnv;
  process.env.ENABLE_TEST_AUTH = "true";
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.PGSSL = "false";
  process.env.SESSION_SECRET = "test-secret";
  process.env.DISCORD_CLIENT_ID = "client";
  process.env.DISCORD_CLIENT_SECRET = "secret";
  process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/auth/discord/callback";
  process.env.DISCORD_GUILD_ID = "guild";
  process.env.ADMIN_DISCORD_IDS = "999999999999999999";
  process.env.PUBLIC_BASE_URL = nodeEnv === "production" ? "https://portal.example.test" : "http://localhost:3000";
  process.env.STORAGE_DRIVER = "local";
  process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION = "true";
  process.env.LIVE_IMAGE_TABLE = "squig_survival_images";
}

function loadApp(nodeEnv = "test") {
  configureEnv(nodeEnv);
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

async function prepareDb() {
  const pool = createTestPool();
  await resetDatabase(pool);
  const migration = runMigrate();
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  await pool.query(`
    INSERT INTO squig_survival_images (image_url, user_id, added_by, created_at, era_keys, reward_points, prompt_text)
    VALUES ('https://cdn.example.test/approved.webp', '222222222222222222', 'mod', now(), 'airport', 100, 'prompt')
  `);
  await pool.query(`
    INSERT INTO squig_survival_image_submissions (
      id, discord_user_id, discord_username, discord_display_name, era_key, prompt_text,
      nft_used_type, nft_used_text, image_url, storage_key, mime_type, size_bytes, status, reward_points
    ) VALUES
      (101, '111111111111111111', 'pending_user', 'Pending User', 'day_one', 'prompt', 'squigs', NULL,
       'https://cdn.example.test/pending.png', 'legacy/pending.png', 'image/png', 100, 'pending', 150),
      (102, '222222222222222222', 'approved_user', 'Approved User', 'airport', 'prompt', 'other', 'Other NFT',
       'https://cdn.example.test/approved.webp', 'legacy/approved.webp', 'image/webp', 100, 'approved', 100)
  `);
  return pool;
}

async function authenticatedGet(baseUrl, cookie, pathName = "/admin") {
  return request(baseUrl, {
    path: pathName,
    headers: {
      cookie,
      "x-test-user-id": "999999999999999999",
      "x-test-username": "test_admin",
    },
  });
}

async function postForm(baseUrl, cookie, pathName, values, origin = "http://localhost:3000") {
  return request(baseUrl, {
    method: "POST",
    path: pathName,
    headers: {
      cookie,
      origin,
      "content-type": "application/x-www-form-urlencoded",
      "x-test-user-id": "999999999999999999",
      "x-test-username": "test_admin",
    },
    body: formBody(values),
  });
}

test("security headers are present on actual responses", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareDb();
  const app = loadApp();
  const { server, baseUrl } = await startServer(app);
  const response = await request(baseUrl, { path: "/health/live" });
  assert.match(response.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.match(response.headers["content-security-policy"], /script-src 'self' 'nonce-/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["referrer-policy"], "strict-origin-when-cross-origin");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(response.headers["x-powered-by"], undefined);
  server.close();
  await pool.end();
});

test("production session cookie is secure and httpOnly", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareDb();
  const app = loadApp("production");
  const { server, baseUrl } = await startServer(app);
  const response = await request(baseUrl, {
    path: "/admin",
    headers: {
      "x-forwarded-proto": "https",
      "x-test-user-id": "999999999999999999",
      "x-test-username": "test_admin",
    },
  });
  const setCookie = response.headers["set-cookie"]?.join("\n") || "";
  assert.match(setCookie, /squig\.submit\.sid=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  server.close();
  await pool.end();
});

test("CSRF and Origin protection covers state-changing form routes", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const routes = [
    {
      path: "/logout",
      values: {},
      prepare: async () => {},
    },
    {
      path: "/admin/submissions/101/approve",
      values: { row_version: "1", reward_points: "150", override_era_key: "day_one", override_nft_used_type: "squigs" },
      prepare: async () => {},
    },
    {
      path: "/admin/submissions/101/decline",
      values: { row_version: "1", reason: "Needs clearer era fit." },
      prepare: async () => {},
    },
    {
      path: "/admin/submissions/102/update-approved",
      values: {
        row_version: "1",
        reward_points: "100",
        override_discord_user_id: "222222222222222222",
        override_discord_username: "approved_user",
        override_discord_display_name: "Approved User",
        override_era_key: "airport",
        override_nft_used_type: "other",
        override_nft_used_text: "Other NFT",
      },
      prepare: async () => {},
    },
  ];

  for (const route of routes) {
    const pool = await prepareDb();
    const app = loadApp();
    const { server, baseUrl } = await startServer(app);
    let cookie = "";
    const page = await authenticatedGet(baseUrl, cookie, "/admin");
    cookie = cookieHeader(cookie, page);
    const token = extractCsrf(page.body);
    assert.ok(token, route.path);

    const missing = await postForm(baseUrl, cookie, route.path, route.values);
    assert.equal(missing.statusCode, 403, `${route.path} missing token`);
    assert.doesNotMatch(missing.body, token);

    const invalid = await postForm(baseUrl, cookie, route.path, { ...route.values, _csrf: "bad-token" });
    assert.equal(invalid.statusCode, 403, `${route.path} invalid token`);

    const badOrigin = await postForm(baseUrl, cookie, route.path, { ...route.values, _csrf: token }, "https://evil.example.test");
    assert.equal(badOrigin.statusCode, 403, `${route.path} bad origin`);

    const otherSessionPage = await authenticatedGet(baseUrl, "", "/admin");
    const otherToken = extractCsrf(otherSessionPage.body);
    const otherTokenResponse = await postForm(baseUrl, cookie, route.path, { ...route.values, _csrf: otherToken });
    assert.equal(otherTokenResponse.statusCode, 403, `${route.path} other session token`);

    const valid = await postForm(baseUrl, cookie, route.path, { ...route.values, _csrf: token });
    assert.notEqual(valid.statusCode, 403, `${route.path} valid token`);

    server.close();
    await pool.end();
  }
});

test("OAuth and health GET routes are not blocked by CSRF", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareDb();
  const app = loadApp();
  const { server, baseUrl } = await startServer(app);
  const live = await request(baseUrl, { path: "/health/live" });
  const ready = await request(baseUrl, { path: "/health/ready" });
  const oauth = await request(baseUrl, { path: "/auth/discord" });
  assert.equal(live.statusCode, 200);
  assert.equal(ready.statusCode, 200);
  assert.equal(oauth.statusCode, 302);
  server.close();
  await pool.end();
});

test("invalid-CSRF multipart upload is rejected before rows or storage writes", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const pool = await prepareDb();
  const uploadsDir = path.join(__dirname, "..", "public", "uploads");
  const beforeFiles = await fs.readdir(uploadsDir);
  const beforeRows = await pool.query("SELECT count(*)::int AS count FROM squig_survival_image_submissions");
  const beforeAudit = await pool.query("SELECT count(*)::int AS count FROM squig_survival_image_moderation_audit");
  const app = loadApp();
  const { server, baseUrl } = await startServer(app);
  const page = await authenticatedGet(baseUrl, "", "/submit");
  const cookie = cookieHeader("", page);

  const boundary = "----squigs-test-boundary";
  const body = multipartBody(
    boundary,
    { era_key: "day_one", nft_used_type: "squigs", prompt_text: "prompt", _csrf: "bad-token" },
    { fieldName: "images", fileName: "test.png", contentType: "image/png", content: Buffer.from("not-real-image") }
  );
  const response = await request(baseUrl, {
    method: "POST",
    path: "/submit",
    headers: {
      cookie,
      origin: "http://localhost:3000",
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": body.length,
      "x-csrf-token": "bad-token",
      "x-test-user-id": "111111111111111111",
      "x-test-username": "submitter",
    },
    body,
  });
  assert.equal(response.statusCode, 403);
  const afterRows = await pool.query("SELECT count(*)::int AS count FROM squig_survival_image_submissions");
  const afterAudit = await pool.query("SELECT count(*)::int AS count FROM squig_survival_image_moderation_audit");
  const afterFiles = await fs.readdir(uploadsDir);
  assert.equal(afterRows.rows[0].count, beforeRows.rows[0].count);
  assert.equal(afterAudit.rows[0].count, beforeAudit.rows[0].count);
  assert.deepEqual(afterFiles, beforeFiles);
  server.close();
  await pool.end();
});

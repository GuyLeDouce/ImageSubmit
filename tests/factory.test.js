const test = require("node:test");
const assert = require("node:assert/strict");
const session = require("express-session");
const { cookieHeader, extractCsrf, formBody, multipartBody, request, startServer } = require("./helpers/http");

Object.assign(process.env, {
  NODE_ENV: "test", ENABLE_TEST_AUTH: "true", SESSION_SECRET: "factory-test-secret",
  DATABASE_URL: "postgres://test:test@localhost/factory_test", PGSSL: "false",
  DISCORD_CLIENT_ID: "test", DISCORD_CLIENT_SECRET: "test",
  DISCORD_REDIRECT_URI: "http://localhost:3000/auth/discord/callback",
  DISCORD_GUILD_ID: "test", ADMIN_DISCORD_IDS: "999999999999999999",
});

// Test-only catalog: proves a second era works without editing routes or templates.
const catalogPath = require.resolve("../src/eraCatalog");
const originalCatalog = require(catalogPath);
const spaceMilestone = { key: "empty_lot", number: 1, label: "Chapter 1 - Moon Base", district: "Moon Base", concept: "Squigs build a moon base." };
require.cache[catalogPath].exports = [
  ...originalCatalog,
  { key: "space_test", label: "Space Test", description: "A lunar survival world.", acceptingSubmissions: true, milestones: [spaceMilestone] },
  { key: "closed_test", label: "Closed Test", description: "Closed.", acceptingSubmissions: false, milestones: [ { ...spaceMilestone } ] },
  { key: "free_test", label: "Free Test", description: "An era without milestones.", acceptingSubmissions: true, milestones: [] },
];
const eras = require("../src/eras");
const realDb = require("../src/db");
const pending = {
  id: 7, row_version: 1, era_key: "space_test", milestone_key: "empty_lot",
  milestone_number: 1, milestone_label: "Chapter 1 - Moon Base", milestone_district: "Moon Base",
  discord_user_id: "999999999999999999", discord_username: "creator", discord_display_name: "Creator",
  nft_used_type: "squigs", contains_squig_confirmed: true, image_url: "https://example.test/image.png",
  submitted_at: new Date(), status: "pending", reward_points: 100,
};
const calls = { uploads: [], approvals: [], repairs: [], files: [] };
const dbStub = {
  pool: realDb.pool,
  listApprovedSubmissions: async () => [{ ...pending, status: "approved" }],
  listPendingSubmissions: async () => [pending],
  listDeclinedSubmissions: async () => [{ ...pending, status: "declined" }],
  listSubmissionsForUser: async () => [pending, { ...pending, id: 8, era_key: "ugly_city", status: "approved" }],
  createPendingSubmission: async (input) => calls.uploads.push(input),
  approveSubmission: async (input) => calls.approvals.push(input),
  updateApprovedSubmission: async (input) => calls.repairs.push(input),
};
require.cache[require.resolve("../src/db")].exports = dbStub;
require("connect-pg-simple");
require.cache[require.resolve("connect-pg-simple")].exports = () => session.MemoryStore;
require("../src/storage");
require.cache[require.resolve("../src/storage")].exports = {
  storeFile: async (file) => {
    calls.files.push(file);
    return { publicUrl: "https://example.test/upload.png", storageKey: "test/upload.png" };
  },
};
const { createApp } = require("../src/app");

test("catalog scopes milestones by era, preserves limits, and rejects invalid definitions", () => {
  assert.equal(eras.resolveEraMilestone("space_test", "empty_lot", { required: true }).district, "Moon Base");
  assert.equal(eras.resolveEraMilestone("ugly_city", "empty_lot", { required: true }).district, "Empty Lot");
  assert.throws(() => eras.resolveEraMilestone("space_test", "first_camp", { required: true }));
  assert.throws(() => eras.resolveEraMilestone("ugly_city", "empty_lot", { required: true, forSubmission: true, legacyLimit: 0 }));
  assert.equal(eras.getEraMilestones("space_test", { forSubmission: true, legacyLimit: 0 }).length, 1);
  assert.equal(eras.getEraByKey("closed_test"), null);
  assert.equal(eras.getEraMilestones("closed_test", { forSubmission: true }).length, 0);
  assert.equal(eras.resolveEraMilestone("free_test", "", { required: true }), null);
  assert.throws(() => eras.resolveEraMilestone("free_test", "empty_lot"));
  assert.throws(() => eras.validateEraCatalog([originalCatalog[0], originalCatalog[0]]));
  assert.throws(() => eras.validateEraCatalog([{ ...originalCatalog[0], milestones: [spaceMilestone, spaceMilestone] }]));
});

test("HTTP submission, moderation, and history support a second era", async () => {
  const { server, baseUrl } = await startServer(createApp());
  let cookie = "";
  let csrf;
  async function get(path) {
    const response = await request(baseUrl, { path, headers: { cookie, "x-test-user-id": pending.discord_user_id } });
    cookie = cookieHeader(cookie, response);
    csrf = extractCsrf(response.body);
    return response;
  }
  async function upload(era, milestone) {
    const boundary = "factory-test-boundary";
    return request(baseUrl, {
      path: "/submit", method: "POST",
      headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` },
      body: multipartBody(boundary, { _csrf: csrf, era_key: era, milestone_key: milestone, contains_squig_confirmed: "on" },
        { fieldName: "images", fileName: "scene.png", contentType: "image/png", content: Buffer.from("fixture") }),
    });
  }
  async function approve(era, milestone) {
    return request(baseUrl, {
      path: "/admin/submissions/7/approve", method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: formBody({ _csrf: csrf, row_version: 1, reward_points: 100, image_url: pending.image_url,
        override_era_key: era, override_milestone_key: milestone, contains_squig_confirmed: "on" }),
    });
  }
  try {
    const home = await get("/");
    assert.equal(home.statusCode, 200);
    assert.match(home.body, /Squig Survival Image Factory/);
    assert.match(home.body, /Space Test/);
    assert.doesNotMatch(home.body, /Closed Test/);
    const form = await get("/submit?era=space_test");
    assert.equal(form.statusCode, 200);
    assert.match(form.body, /name="era_key" value="space_test"/);
    assert.match(form.body, /Squigs build a moon base/);
    assert.doesNotMatch(form.body, /value="first_camp"/);
    const submitted = await upload("space_test", "empty_lot");
    assert.equal(submitted.statusCode, 302);
    assert.equal(submitted.headers.location, "/submit?era=space_test&submitted=1&milestone=empty_lot");
    assert.equal(calls.uploads.at(-1).eraKey, "space_test");
    assert.equal(calls.uploads.at(-1).milestoneDistrict, "Moon Base");
    for (const [era, milestone] of [["space_test", "first_camp"], ["closed_test", "empty_lot"], ["missing", "empty_lot"]]) {
      assert.ok((await upload(era, milestone)).statusCode >= 400);
    }
    assert.equal(calls.files.length, 1, "invalid requests do not store files");
    assert.equal((await get("/submit?era=closed_test")).statusCode, 400);
    await get("/submit?era=free_test");
    assert.equal((await upload("free_test", "")).statusCode, 302);
    assert.equal(calls.uploads.at(-1).milestoneKey, null);
    const admin = await get("/admin");
    assert.equal(admin.statusCode, 200);
    assert.match(admin.body, /data-era="space_test" selected/);
    assert.equal((await approve("space_test", "empty_lot")).statusCode, 302);
    assert.equal(calls.approvals.at(-1).overrideEraKey, "space_test");
    assert.equal(calls.approvals.at(-1).overrideMilestone.district, "Moon Base");
    assert.equal((await approve("closed_test", "empty_lot")).statusCode, 302, "closed era pending images can still be moderated");
    assert.ok((await approve("space_test", "first_camp")).statusCode >= 400);
    const profile = await get("/profile");
    assert.equal(profile.statusCode, 200);
    assert.match(profile.body, /<dd>Space Test<\/dd>/);
    assert.match(profile.body, /<dd>The Rise of Ugly City<\/dd>/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("approval SQL preserves selected era and clears old milestones when moving pools", async () => {
  const originalConnect = realDb.pool.connect;
  const queries = [];
  realDb.pool.connect = async () => ({
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (/SELECT \*/.test(sql)) return { rows: [pending] };
      return { rows: [{ ...pending, row_version: 2 }], rowCount: 1 };
    },
    release() {},
  });
  try {
    await realDb.approveSubmission({ submissionId: 7, expectedRowVersion: 1, rewardPoints: 100, reviewedBy: "mod",
      overrideEraKey: "space_test", overrideMilestone: spaceMilestone });
    const live = queries.find(({ sql }) => /INSERT INTO squig_survival_images/.test(sql));
    const notification = queries.find(({ sql }) => /INSERT INTO squig_survival_image_approval_notifications/.test(sql));
    assert.equal(live.params[3], "space_test");
    assert.equal(live.params[9], "Moon Base");
    assert.equal(notification.params[3], "space_test");
    queries.length = 0;
    await realDb.approveSubmission({ submissionId: 7, expectedRowVersion: 1, rewardPoints: 100, reviewedBy: "mod", overrideEraKey: "free_test", overrideMilestone: null });
    const moved = queries.find(({ sql }) => /INSERT INTO squig_survival_images/.test(sql));
    assert.equal(moved.params[3], "free_test");
    assert.deepEqual(moved.params.slice(6), [null, null, null, null]);
  } finally {
    realDb.pool.connect = originalConnect;
    await realDb.pool.end();
  }
});

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "app.js"), "utf8");
const dbSource = fs.readFileSync(path.join(__dirname, "..", "src", "db.js"), "utf8");

test("legacy route paths remain registered", () => {
  for (const route of [
    `app.get("/",`,
    `app.get("/auth/discord",`,
    `app.get("/auth/discord/callback",`,
    `app.post("/logout",`,
    `app.get("/submit",`,
    `app.post("/submit",`,
    `app.get("/admin",`,
    `app.post("/admin/submissions/:id/approve",`,
    `app.post("/admin/submissions/:id/decline",`,
    `app.post("/admin/submissions/:id/update-approved",`,
  ]) {
    assert.match(appSource, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("session cookie contract remains stable", () => {
  assert.match(appSource, /name:\s*"squig\.submit\.sid"/);
});

test("approval insert preserves bot-facing live table columns", () => {
  for (const column of ["image_url", "user_id", "added_by", "created_at", "era_keys", "reward_points", "prompt_text"]) {
    assert.match(dbSource, new RegExp(`\\b${column}\\b`));
  }
  assert.match(dbSource, /INSERT INTO \$\{config\.liveImageTable\}/);
  assert.match(dbSource, /INSERT INTO squig_survival_image_approval_notifications/);
  assert.match(dbSource, /status = 'approved'/);
  assert.match(dbSource, /ROLLBACK/);
});

test("startup database initialization does not run DDL", () => {
  const initDbBody = dbSource.match(/async function initDb\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(initDbBody, /\bCREATE\b|\bALTER\b|\bDROP\b|\bTRUNCATE\b/i);
});

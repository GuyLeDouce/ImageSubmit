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
    `app.get("/profile",`,
    `app.get("/admin",`,
    `app.post("/admin/submissions/:id/approve",`,
    `app.post("/admin/submissions/:id/decline",`,
    `app.post("/admin/submissions/:id/update-approved",`,
    `app.post("/admin/submissions/:id/unapprove",`,
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

test("startup database initialization runs only additive schema repair", () => {
  const initDbBody = dbSource.match(/async function initDb\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(initDbBody, /ensureRuntimeSchema\(\)/);
  const repairBody = dbSource.match(/async function ensureRuntimeSchema\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(repairBody, /ADD COLUMN IF NOT EXISTS decline_reason/);
  assert.match(repairBody, /ADD COLUMN IF NOT EXISTS row_version/);
  assert.match(repairBody, /CREATE TABLE IF NOT EXISTS squig_survival_image_moderation_audit/);
  assert.doesNotMatch(repairBody, /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i);
});

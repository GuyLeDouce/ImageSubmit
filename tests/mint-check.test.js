const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

test("obsolete mint scanner rejects banned strings case-insensitively", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "squigs-mint-scan-"));
  const repoRoot = path.join(__dirname, "..");
  const fixturePath = path.join(repoRoot, ".scan-fixture.tmp");
  try {
    fs.writeFileSync(fixturePath, Buffer.from("TWludCBub3c=", "base64").toString("utf8"));
    const result = spawnSync(process.execPath, ["scripts/check-mint-copy.js"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /banned phrase/i);
  } finally {
    fs.rmSync(fixturePath, { force: true });
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

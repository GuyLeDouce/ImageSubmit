require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { getSSL } = require("../src/config");

const databaseUrl = process.env.MIGRATION_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("MIGRATION_DATABASE_URL, TEST_DATABASE_URL, or DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: getSSL(databaseUrl),
  statement_timeout: 30000,
  query_timeout: 30000,
});

function checksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function listMigrations() {
  return fs.readdirSync(path.join(__dirname, "..", "migrations"))
    .filter((fileName) => /^\d+_.+\.sql$/.test(fileName))
    .sort()
    .map((fileName) => {
      const fullPath = path.join(__dirname, "..", "migrations", fileName);
      const content = fs.readFileSync(fullPath, "utf8");
      return { fileName, content, checksum: checksum(content) };
    });
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS squig_survival_schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function runMigrations() {
  const client = await pool.connect();
  const applied = [];
  const skipped = [];
  try {
    await ensureLedger(client);
    for (const migration of listMigrations()) {
      const existing = await client.query(
        "SELECT checksum FROM squig_survival_schema_migrations WHERE filename = $1",
        [migration.fileName]
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== migration.checksum) {
          throw new Error(`Recorded checksum does not match migration ${migration.fileName}.`);
        }
        skipped.push(migration.fileName);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.content);
        if (process.env.INJECT_MIGRATION_FAILURE_AFTER === migration.fileName) {
          throw new Error(`Injected migration failure after ${migration.fileName}`);
        }
        await client.query(
          "INSERT INTO squig_survival_schema_migrations (filename, checksum) VALUES ($1, $2)",
          [migration.fileName, migration.checksum]
        );
        await client.query("COMMIT");
        applied.push(migration.fileName);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  return { applied, skipped };
}

if (require.main === module) {
  runMigrations()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  listMigrations,
  runMigrations,
};

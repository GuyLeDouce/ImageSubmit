const { Pool } = require("pg");
const { assertTestDatabaseUrl } = require("./database-url");

function getTestDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  assertTestDatabaseUrl(url);
  return url;
}

function createTestPool() {
  const connectionString = getTestDatabaseUrl();
  if (!connectionString) return null;
  return new Pool({ connectionString, ssl: process.env.PGSSL === "false" ? false : undefined });
}

async function resetDatabase(pool) {
  await pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
}

module.exports = {
  createTestPool,
  getTestDatabaseUrl,
  resetDatabase,
};

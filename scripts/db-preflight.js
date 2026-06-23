require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { config, getSSL } = require("../src/config");
const { SURVIVAL_ERA_KEYS } = require("../src/eras");

const liveTableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
if (!liveTableRegex.test(config.liveImageTable)) {
  throw new Error(`Unsafe LIVE_IMAGE_TABLE value: ${config.liveImageTable}`);
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: getSSL(config.databaseUrl),
  statement_timeout: 10000,
  query_timeout: 10000,
});

async function tableExists(client, tableName) {
  const result = await client.query("SELECT to_regclass($1) AS regclass", [tableName]);
  return Boolean(result.rows[0]?.regclass);
}

async function getColumns(client, tableName) {
  const result = await client.query(
    `
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = ANY (current_schemas(false))
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName]
  );
  return result.rows;
}

async function getIndexes(client, tableName) {
  const result = await client.query(
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = ANY (current_schemas(false))
        AND tablename = $1
      ORDER BY indexname
    `,
    [tableName]
  );
  return result.rows;
}

async function getConstraints(client, tableName) {
  const result = await client.query(
    `
      SELECT conname, contype, pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = ANY (current_schemas(false))
        AND t.relname = $1
      ORDER BY conname
    `,
    [tableName]
  );
  return result.rows;
}

async function countByStatus(client) {
  if (!(await tableExists(client, "squig_survival_image_submissions"))) return [];
  const result = await client.query(`
    SELECT status, count(*)::int AS count
    FROM squig_survival_image_submissions
    GROUP BY status
    ORDER BY status
  `);
  return result.rows;
}

async function invalidEraKeys(client, tableName, columnName) {
  if (!(await tableExists(client, tableName))) return [];
  const keys = Array.from(SURVIVAL_ERA_KEYS);
  const result = await client.query(
    `
      SELECT ${columnName} AS era_key, count(*)::int AS count
      FROM ${tableName}
      WHERE ${columnName} IS NOT NULL
        AND NOT (${columnName} = ANY($1::text[]))
      GROUP BY ${columnName}
      ORDER BY count DESC, ${columnName}
    `,
    [keys]
  );
  return result.rows;
}

async function duplicateNotifications(client) {
  if (!(await tableExists(client, "squig_survival_image_approval_notifications"))) return [];
  const result = await client.query(`
    SELECT submission_id, count(*)::int AS count
    FROM squig_survival_image_approval_notifications
    WHERE submission_id IS NOT NULL
    GROUP BY submission_id
    HAVING count(*) > 1
    ORDER BY count DESC, submission_id
    LIMIT 100
  `);
  return result.rows;
}

async function notificationCounts(client) {
  if (!(await tableExists(client, "squig_survival_image_approval_notifications"))) return [];
  const result = await client.query(`
    SELECT post_status, count(*)::int AS count
    FROM squig_survival_image_approval_notifications
    GROUP BY post_status
    ORDER BY post_status
  `);
  return result.rows;
}

async function malformedImageUrls(client) {
  if (!(await tableExists(client, "squig_survival_image_submissions"))) return [];
  const result = await client.query(`
    SELECT id, image_url
    FROM squig_survival_image_submissions
    WHERE image_url !~ '^https?://'
    ORDER BY id
    LIMIT 100
  `);
  return result.rows;
}

async function main() {
  if (!config.databaseUrl) throw new Error("DATABASE_URL is required for db:preflight.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const version = await client.query("SHOW server_version");
    const searchPath = await client.query("SHOW search_path");
    const tables = [
      config.liveImageTable,
      "squig_survival_image_submissions",
      "squig_survival_image_approval_notifications",
      config.sessionTable,
    ];

    const tableReports = {};
    for (const tableName of tables) {
      const exists = await tableExists(client, tableName);
      tableReports[tableName] = exists
        ? {
            exists,
            columns: await getColumns(client, tableName),
            indexes: await getIndexes(client, tableName),
            constraints: await getConstraints(client, tableName),
          }
        : { exists };
    }

    const report = {
      generatedAt: new Date().toISOString(),
      database: {
        serverVersion: version.rows[0].server_version,
        searchPath: searchPath.rows[0].search_path,
      },
      liveImageTable: config.liveImageTable,
      tables: tableReports,
      rowCountsByStatus: await countByStatus(client),
      invalidSubmissionEraKeys: await invalidEraKeys(client, "squig_survival_image_submissions", "era_key"),
      invalidLiveEraKeys: await invalidEraKeys(client, config.liveImageTable, "era_keys"),
      duplicateNotifications: await duplicateNotifications(client),
      notificationCounts: await notificationCounts(client),
      malformedSubmissionImageUrls: await malformedImageUrls(client),
      eraKeysInCode: Array.from(SURVIVAL_ERA_KEYS),
      notes: [
        "This command starts a READ ONLY transaction and performs no DDL or DML.",
        "Object storage inventory checks require a separate credentials-aware report and are not performed here yet.",
        "Ambiguous live-row linkage needs production schema facts before any migration proposal is applied.",
      ],
    };

    await client.query("ROLLBACK");
    const outputDir = path.join(__dirname, "..", "preflight-reports");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `preflight-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log("Squigs Reloaded Creator Portal DB preflight");
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`Postgres: ${report.database.serverVersion}`);
    console.log(`Live table: ${report.liveImageTable}`);
    for (const [tableName, table] of Object.entries(report.tables)) {
      console.log(`- ${tableName}: ${table.exists ? `${table.columns.length} columns` : "missing"}`);
    }
    console.log(`JSON report: ${outputPath}`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // Ignore rollback failures during fatal preflight errors.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

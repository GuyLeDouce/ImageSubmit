function assertTestDatabaseUrl(rawUrl) {
  if (!rawUrl) return null;
  const parsed = new URL(rawUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  const text = rawUrl.toLowerCase();
  const dbNameLower = dbName.toLowerCase();
  const safeName =
    dbNameLower.includes("test") ||
    dbNameLower.includes("tmp") ||
    dbNameLower.includes("ci") ||
    dbNameLower.includes("disposable");

  const unsafeHints = ["prod", "production", "railway", "render", "neon", "supabase"];
  if (!safeName || unsafeHints.some((hint) => text.includes(hint))) {
    throw new Error("Refusing to run integration tests because TEST_DATABASE_URL does not look disposable.");
  }
  return parsed;
}

module.exports = {
  assertTestDatabaseUrl,
};

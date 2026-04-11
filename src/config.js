const path = require("path");
require("dotenv").config();

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSSL(connectionString) {
  if (!connectionString) return undefined;
  return process.env.PGSSL === "false"
    ? false
    : { rejectUnauthorized: false };
}

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction: (process.env.NODE_ENV || "development") === "production",
  port: Number(process.env.PORT || "3000"),
  publicBaseUrl: String(process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: process.env.SESSION_SECRET || "",
  databaseUrl: process.env.DATABASE_URL || "",
  liveImageTable: process.env.LIVE_IMAGE_TABLE || "squig_survival_images",
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI || "",
  discordGuildId: process.env.DISCORD_GUILD_ID || "",
  adminDiscordIds: new Set(parseCsv(process.env.ADMIN_DISCORD_IDS)),
  maxUploadMb: Math.max(1, Number(process.env.MAX_UPLOAD_MB || "10")),
  storageDriver: (process.env.STORAGE_DRIVER || "local").toLowerCase(),
  s3Region: process.env.S3_REGION || "auto",
  s3Bucket: process.env.S3_BUCKET || "",
  s3Endpoint: process.env.S3_ENDPOINT || "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  s3PublicBaseUrl: String(process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, ""),
  uploadsDir: path.join(__dirname, "..", "public", "uploads"),
};

function validateConfig() {
  const missing = [];
  if (!config.sessionSecret) missing.push("SESSION_SECRET");
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.discordClientId) missing.push("DISCORD_CLIENT_ID");
  if (!config.discordClientSecret) missing.push("DISCORD_CLIENT_SECRET");
  if (!config.discordRedirectUri) missing.push("DISCORD_REDIRECT_URI");
  if (!config.discordGuildId) missing.push("DISCORD_GUILD_ID");

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (config.storageDriver === "s3") {
    const s3Missing = [];
    if (!config.s3Bucket) s3Missing.push("S3_BUCKET");
    if (!config.s3Endpoint) s3Missing.push("S3_ENDPOINT");
    if (!config.s3AccessKeyId) s3Missing.push("S3_ACCESS_KEY_ID");
    if (!config.s3SecretAccessKey) s3Missing.push("S3_SECRET_ACCESS_KEY");
    if (!config.s3PublicBaseUrl) s3Missing.push("S3_PUBLIC_BASE_URL");
    if (s3Missing.length) {
      throw new Error(`Missing S3 storage environment variables: ${s3Missing.join(", ")}`);
    }
  }
}

module.exports = {
  config,
  getSSL,
  validateConfig,
};

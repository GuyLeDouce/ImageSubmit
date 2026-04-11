const multer = require("multer");
const { config } = require("./config");
const { SURVIVAL_ERA_KEYS } = require("./eras");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Only JPG, PNG, WEBP, and GIF uploads are allowed."));
    }
    callback(null, true);
  },
});

function validateEraKey(eraKey) {
  return SURVIVAL_ERA_KEYS.has(eraKey);
}

function parseRewardPoints(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
    throw new Error("Reward points must be an integer from 0 to 100000.");
  }
  return parsed;
}

function parseOptionalDiscordUserId(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return null;
  if (!/^\d{17,20}$/.test(trimmed)) {
    throw new Error("Discord user ID must be a valid numeric Discord snowflake.");
  }
  return trimmed;
}

function parseOptionalText(rawValue, fieldName, maxLength = 100) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

module.exports = {
  upload,
  validateEraKey,
  parseRewardPoints,
  parseOptionalDiscordUserId,
  parseOptionalText,
};

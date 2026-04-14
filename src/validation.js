const multer = require("multer");
const { config } = require("./config");
const { SURVIVAL_ERA_KEYS } = require("./eras");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxFilesPerSubmission = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: maxFilesPerSubmission },
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

function parseNftUsedType(rawValue) {
  const value = String(rawValue || "").trim().toLowerCase();
  if (value === "squigs" || value === "other") {
    return value;
  }
  throw new Error("Please choose whether the image used Squigs or another NFT.");
}

function isReviveEra(eraKey) {
  return eraKey === "!revive Success" || eraKey === "!revive Failed";
}

function resolveDefaultRewardPoints(nftUsedType, eraKey) {
  if (isReviveEra(eraKey)) {
    return nftUsedType === "other" ? 10 : 20;
  }
  return nftUsedType === "other" ? 100 : 150;
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
  maxFilesPerSubmission,
  validateEraKey,
  parseNftUsedType,
  isReviveEra,
  resolveDefaultRewardPoints,
  parseRewardPoints,
  parseOptionalDiscordUserId,
  parseOptionalText,
};

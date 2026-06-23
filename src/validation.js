const multer = require("multer");
const { config } = require("./config");
const {
  COLLECTION_TYPES,
  SURVIVAL_ERA_KEYS,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
} = require("./eras");

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
  if (value === COLLECTION_TYPES.squigs || value === COLLECTION_TYPES.other) {
    return value;
  }
  throw new Error("Please choose whether the image used Squigs or another NFT.");
}

function isReviveEra(eraKey) {
  return eraKey === "!revive Success" || eraKey === "!revive Failed";
}

function resolveDefaultRewardPoints(nftUsedType, eraKey) {
  const reward = resolveEraDefaultReward(nftUsedType, eraKey);
  if (reward === null) {
    throw new Error("This era only accepts Squigs Reloaded submissions.");
  }
  return reward;
}

function assertCollectionAllowedForEra(nftUsedType, eraKey) {
  if (!isCollectionTypeAllowedForEra(eraKey, nftUsedType)) {
    throw new Error("This era only accepts Squigs Reloaded submissions.");
  }
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
  assertCollectionAllowedForEra,
  parseRewardPoints,
  parseOptionalDiscordUserId,
  parseOptionalText,
};

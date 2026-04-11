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

module.exports = {
  upload,
  validateEraKey,
  parseRewardPoints,
};

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { config } = require("./config");

const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

let s3Client = null;

function getFileExtension(mimeType) {
  return IMAGE_EXTENSIONS[mimeType] || ".bin";
}

function buildStorageKey(originalName, mimeType) {
  const safeBase = path.basename(originalName || "upload")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 64);
  const extension = getFileExtension(mimeType);
  const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  return `${unique}-${safeBase || "image"}${extension}`;
}

function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = require("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  });
  return s3Client;
}

async function storeFile(file) {
  const storageKey = buildStorageKey(file.originalname, file.mimetype);

  if (config.storageDriver === "s3") {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const client = getS3Client();
    await client.send(new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return { storageKey, publicUrl: `${config.s3PublicBaseUrl}/${storageKey}` };
  }

  await fs.mkdir(config.uploadsDir, { recursive: true });
  const destination = path.join(config.uploadsDir, storageKey);
  await fs.writeFile(destination, file.buffer);
  return { storageKey, publicUrl: `${config.publicBaseUrl}/uploads/${storageKey}` };
}

module.exports = {
  storeFile,
};

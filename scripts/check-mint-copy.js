const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const banned = [
  `bueno.art/${"squigs"}/mint`,
  `Mint a ${"Squig"}`,
  `Mint ${"now"}`,
];
const ignoredDirs = new Set([".git", "node_modules", "public/uploads"]);
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name) || entry.name.startsWith("node_modules")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (!ignoredExtensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

const violations = [];
for (const filePath of walk(root)) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const phrase of banned) {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`${path.relative(root, filePath)} contains banned phrase: ${phrase}`);
    }
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("No obsolete mint link or CTA copy found.");

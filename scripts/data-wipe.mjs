import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(
    [
      "Usage:",
      "  npm run data:wipe             # show what would be removed",
      "  npm run data:wipe -- --yes    # remove it",
      "",
      "Removes shoreproof.db (plus WAL/SHM files) and uploads/ under DATA_DIR.",
      "The fetched model in public/models/ and the public site are untouched.",
    ].join("\n"),
  );
  process.exit(0);
}

const dataDir = path.resolve(
  process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
);

function refuse(message) {
  console.error(`Refusing to wipe: ${message}`);
  console.error(`Resolved DATA_DIR: ${dataDir}`);
  process.exit(1);
}

if (dataDir === path.parse(dataDir).root) {
  refuse("DATA_DIR resolves to the filesystem root.");
}
if (dataDir === os.homedir()) {
  refuse("DATA_DIR resolves to the home directory.");
}
if (dataDir === process.cwd()) {
  refuse("DATA_DIR resolves to the repository root.");
}
if (process.cwd().startsWith(`${dataDir}${path.sep}`)) {
  refuse("DATA_DIR is an ancestor of the repository.");
}

const databaseFiles = [
  "shoreproof.db",
  "shoreproof.db-wal",
  "shoreproof.db-shm",
].map((name) => path.join(dataDir, name));
const uploadsDir = path.join(dataDir, "uploads");

const targets = [
  ...databaseFiles.filter((file) => fs.existsSync(file)),
  ...(fs.existsSync(uploadsDir) ? [uploadsDir] : []),
];

if (targets.length === 0) {
  console.log(`Nothing to remove under ${dataDir}.`);
  process.exit(0);
}

function sizeOf(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    total += sizeOf(path.join(target, entry.name));
  }
  return total;
}

const bytes = targets.reduce((total, target) => total + sizeOf(target), 0);
const readable = `${(bytes / 1024 / 1024).toFixed(1)} MB`;

console.log(`DATA_DIR: ${dataDir}`);
console.log(`Would remove ${targets.length} item(s), ${readable}:`);
for (const target of targets) {
  console.log(`  ${target}`);
}

if (!confirmed) {
  console.log("");
  console.log("Dry run. Re-run with --yes to remove these files.");
  process.exit(0);
}

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
}

console.log("");
console.log(`Removed ${targets.length} item(s), ${readable}.`);
console.log(
  "The fetched model, the code, and any published copy of an export are untouched.",
);

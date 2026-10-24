import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as {
  __shoreproofDb?: Database.Database;
};

export function getDataDir(): string {
  const configured = process.env.DATA_DIR;
  return configured ? path.resolve(configured) : path.join(process.cwd(), "data");
}

export function getUploadsDir(): string {
  return path.join(getDataDir(), "uploads");
}

export function getDb(): Database.Database {
  if (globalForDb.__shoreproofDb) {
    return globalForDb.__shoreproofDb;
  }

  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, "shoreproof.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));

  globalForDb.__shoreproofDb = db;
  return db;
}

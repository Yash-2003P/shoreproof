import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Start a disposable Next.js server for the end-to-end tests. The data
 * directory is recreated on every run, so the tests always begin at first-run
 * setup and never touch a real workspace.
 */
const dataDir = path.resolve(
  process.env.E2E_DATA_DIR ?? path.join(os.tmpdir(), "shoreproof-e2e"),
);
const port = process.env.PORT ?? "3200";

if (dataDir === path.parse(dataDir).root || dataDir === process.cwd()) {
  console.error(`Refusing to use ${dataDir} as the e2e data directory.`);
  process.exit(1);
}

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const nextBin = path.join(process.cwd(), "node_modules", ".bin", "next");
const child = spawn(nextBin, ["dev", "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    NODE_ENV: "development",
  },
});

function stop(signal) {
  child.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

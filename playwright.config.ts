import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "playwright/test";

const dataDir =
  process.env.E2E_DATA_DIR ?? path.join(os.tmpdir(), "shoreproof-e2e");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3200",
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      E2E_DATA_DIR: dataDir,
      PORT: "3200",
    },
  },
});

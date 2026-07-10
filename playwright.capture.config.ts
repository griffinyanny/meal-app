import { defineConfig } from "@playwright/test";
import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";

// Layer A capture config: reuses the whole harness (setup chain, mock-gated
// server on 3102, storageState) but runs ONLY *.capture.ts as its own project,
// so it never pollutes `npm run test:e2e` (the mechanics gate). Same E2E_AI_MOCK
// server as the behavior suite → deterministic placeholder content.
const webServerCommand =
  process.env.E2E_REUSE_BUILD === "1"
    ? `npm run start -- -p ${E2E_PORT}`
    : `npm run build && npm run start -- -p ${E2E_PORT}`;

const base = baseE2EConfig({
  port: E2E_PORT,
  testDir: "./tests/e2e",
  storageStatePath: STORAGE_STATE_PATH,
  webServerCommand,
  webServerEnv: { E2E_AI_MOCK: "1" },
});

export default defineConfig({
  ...base,
  timeout: 120_000,
  projects: [
    base.projects![0], // setup (mints session + bootstraps the test household)
    {
      name: "capture",
      dependencies: ["setup"],
      testMatch: /plan\.capture\.ts$/,
      // deviceScaleFactor 2: crisp enough to read titles/chips, ~half the pixels
      // of the behavior suite's 3x (bounds the cost of Claude reading the PNGs).
      use: { storageState: STORAGE_STATE_PATH, deviceScaleFactor: 2 },
    },
  ],
});

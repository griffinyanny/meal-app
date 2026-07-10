import { defineConfig } from "@playwright/test";
import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";

// Layer B — REAL-MODEL content capture. Deliberately breaks the harness's
// "never hit OpenAI" safety rule to audit actual generated content (variety,
// chip phrasing, real-string layout). Isolated from the default config so a
// routine mock run can NEVER accidentally spend tokens:
//   • its own config file (never invoked by `npm run test:e2e` or the Layer A run)
//   • hard-gated on E2E_LIVE_CAPTURE=1 (refuses to load otherwise)
//   • webServer sets NO E2E_AI_MOCK → getModel() uses the real OpenAI model,
//     with OPENAI_API_KEY loaded from .env.local by `next start`.
if (process.env.E2E_LIVE_CAPTURE !== "1") {
  throw new Error(
    "Layer B (real-model capture) requires E2E_LIVE_CAPTURE=1 — this run hits OpenAI and spends tokens. Refusing to load without the explicit flag."
  );
}

const webServerCommand =
  process.env.E2E_REUSE_BUILD === "1"
    ? `npm run start -- -p ${E2E_PORT}`
    : `npm run build && npm run start -- -p ${E2E_PORT}`;

const base = baseE2EConfig({
  port: E2E_PORT,
  testDir: "./tests/e2e",
  storageStatePath: STORAGE_STATE_PATH,
  webServerCommand,
  // No E2E_AI_MOCK → real model. OPENAI_API_KEY comes from .env.local.
  webServerEnv: {},
});

export default defineConfig({
  ...base,
  timeout: 180_000, // real generations run 7-20s each; several per run
  projects: [
    base.projects![0], // setup
    {
      name: "capture-live",
      dependencies: ["setup"],
      testMatch: /plan-live\.capture\.ts$/,
      use: { storageState: STORAGE_STATE_PATH, deviceScaleFactor: 2 },
    },
  ],
});

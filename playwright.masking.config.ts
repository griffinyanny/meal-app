import { defineConfig } from "@playwright/test";
import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT, TEST_USER_EMAIL } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";

// ⚠️ TEMPORARY, S63 — the one config in this repo that does NOT blank
// NEXT_PUBLIC_POSTHOG_KEY, because its whole purpose is to observe what
// posthog-js actually puts on the wire. Deleted after the check.
//
// It is deliberately NOT named `*.spec.ts` in the normal suite and lives behind
// its own config, so `npm run test:e2e` can never pick it up. The key comes
// from `.env.local` at build time.
//
// Nothing reaches PostHog: the spec ABORTS every request to the ingest host
// after reading its body, so this cannot pollute the project's dataset with
// events from a robot — which is the exact hazard `analytics-config.test.ts`
// exists to prevent for the real suites.
const webServerCommand =
  process.env.E2E_REUSE_BUILD === "1"
    ? `npm run start -- -p ${E2E_PORT}`
    : `npm run build && npm run start -- -p ${E2E_PORT}`;

const base = baseE2EConfig({
  port: E2E_PORT,
  testDir: "./tests/e2e",
  storageStatePath: STORAGE_STATE_PATH,
  webServerCommand,
  webServerEnv: { E2E_AI_MOCK: "1", DEV_TOOLS_EMAILS: TEST_USER_EMAIL },
});

export default defineConfig({
  ...base,
  timeout: 90_000,
  projects: [
    base.projects![0],
    {
      name: "masking",
      dependencies: ["setup"],
      testMatch: /masking-check\.ts$/,
      use: { storageState: STORAGE_STATE_PATH },
    },
  ],
});

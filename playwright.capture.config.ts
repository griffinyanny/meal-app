import { defineConfig } from "@playwright/test";
import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT, TEST_USER_EMAIL } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";
import { assertReusedBuildIsClean } from "./tests/e2e/harness/assert-reused-build-is-clean";

// Layer A capture config: reuses the whole harness (setup chain, mock-gated
// server on 3102, storageState) but runs ONLY *.capture.ts as its own project,
// so it never pollutes `npm run test:e2e` (the mechanics gate). Same E2E_AI_MOCK
// server as the behavior suite → deterministic placeholder content.
assertReusedBuildIsClean();

const webServerCommand =
  process.env.E2E_REUSE_BUILD === "1"
    ? `npm run start -- -p ${E2E_PORT}`
    : `npm run build && npm run start -- -p ${E2E_PORT}`;

const base = baseE2EConfig({
  port: E2E_PORT,
  testDir: "./tests/e2e",
  storageStatePath: STORAGE_STATE_PATH,
  webServerCommand,
  // Mirrors playwright.config.ts: the test-mode card only renders for an
  // allowlisted account, so without this the You capture would silently omit
  // the surface it exists to photograph.
  // ⚠️ `NEXT_PUBLIC_POSTHOG_KEY: ""` for the same reason as playwright.config.ts:
  // inlined at build time, so an explicit empty value beats `.env.local` and
  // keeps 55 capture states out of the dataset and out of the replay quota.
  // Enforced by `analytics-config.test.ts`.
  webServerEnv: {
    E2E_AI_MOCK: "1",
    DEV_TOOLS_EMAILS: TEST_USER_EMAIL,
    NEXT_PUBLIC_POSTHOG_KEY: "",
  },
});

export default defineConfig({
  ...base,
  timeout: 120_000,
  projects: [
    base.projects![0], // setup (mints session + bootstraps the test household)
    {
      name: "capture",
      dependencies: ["setup"],
      // All Layer-A capture specs (plan, groceries, recipes); the Layer-B live
      // capture (plan-live.capture.ts) is excluded — it has its own gated config.
      testMatch: /\.capture\.ts$/,
      testIgnore: /-live\.capture\.ts$/,
      // deviceScaleFactor 2: crisp enough to read titles/chips, ~half the pixels
      // of the behavior suite's 3x (bounds the cost of Claude reading the PNGs).
      use: {
        storageState: STORAGE_STATE_PATH,
        deviceScaleFactor: 2,
        // ⚠️ The harness sets `navigationTimeout` and has never set this one, so
        // every `.click()` in every capture state inherits NO timeout. That is
        // survivable in the behavior suite, whose 30s test budget bounds it
        // anyway — here the budget is 120s for a whole surface, so one action
        // waiting on an element that will never exist eats the entire run and
        // the surface goes ungraded rather than reporting a failed state.
        // BUG-053: `grocery-checked-gotit` clicked a row that was not there.
        // Set at the project level rather than per call site, so a state added
        // later cannot reintroduce it (the unnamed-rung argument, one layer out).
        actionTimeout: 10_000,
      },
    },
  ],
});

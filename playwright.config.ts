import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT, TEST_USER_EMAIL } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";
import { assertReusedBuildIsClean } from "./tests/e2e/harness/assert-reused-build-is-clean";

// Use a production build (`next build && next start`), not `next dev`: Next 16
// refuses a second `next dev` from the same directory (Griffin often has one on
// 3001), and a prod build also avoids dev compile-on-demand flakiness. Fast
// local iteration: build once, then run with E2E_REUSE_BUILD=1 to skip rebuild.
assertReusedBuildIsClean();

const webServerCommand =
  process.env.E2E_REUSE_BUILD === "1"
    ? `npm run start -- -p ${E2E_PORT}`
    : `npm run build && npm run start -- -p ${E2E_PORT}`;

// The mock flag lives ONLY here (never in any .env file), and reuseExistingServer
// is false in the factory — together these guarantee the suite runs against the
// deterministic AI mock and can never accidentally hit real OpenAI.
export default baseE2EConfig({
  port: E2E_PORT,
  testDir: "./tests/e2e",
  storageStatePath: STORAGE_STATE_PATH,
  webServerCommand,
  // Latency high enough that in-place pending states (shimmer, disabled actions)
  // are reliably observable by specs, still fast enough to keep the suite snappy.
  webServerEnv: {
    E2E_AI_MOCK: "1",
    E2E_AI_MOCK_LATENCY_MS: "700",
    // BUG-035 · the real per-attempt stall bound is 45s, which no suite can
    // afford to wait out twice. This drives the SAME code path in seconds, so
    // the timeout is exercised for real rather than simulated with an error.
    // Honoured only when the AI mock is on (see `streamAttemptTimeoutMs`), so
    // it cannot leak into a deployment.
    E2E_AI_ATTEMPT_TIMEOUT_MS: "2500",
    // Test mode is off unless a deployment names the accounts that get it, so
    // the suite has to name its own test identity to exercise the controls at
    // all. Scoped to this one address: a spec that could enable dev tools for an
    // arbitrary user would be testing something the product never does.
    DEV_TOOLS_EMAILS: TEST_USER_EMAIL,
    // ⚠️ Analytics OFF for the whole suite, and this line is load-bearing.
    // `NEXT_PUBLIC_*` is inlined at BUILD time, and the build runs inside
    // `webServerCommand` with this env — so an explicit empty value beats
    // whatever `.env.local` holds. Without it a 139-spec run fabricates
    // hundreds of rituals, plan generations and grocery lists, which then get
    // averaged into the DoD's "time-to-list < 10 minutes on a REAL week" and
    // burn the free-tier replay quota on a robot. Same shape as the AI mock
    // above: the suite must not be able to reach a real vendor.
    // `analytics-config.test.ts` fails if this is removed.
    NEXT_PUBLIC_POSTHOG_KEY: "",
  },
});

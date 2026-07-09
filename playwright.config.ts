import { baseE2EConfig } from "./tests/e2e/harness/config-factory";
import { E2E_PORT } from "./tests/e2e/app/env";
import { STORAGE_STATE_PATH } from "./tests/e2e/app/test-context";

// Use a production build (`next build && next start`), not `next dev`: Next 16
// refuses a second `next dev` from the same directory (Griffin often has one on
// 3001), and a prod build also avoids dev compile-on-demand flakiness. Fast
// local iteration: build once, then run with E2E_REUSE_BUILD=1 to skip rebuild.
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
  webServerEnv: { E2E_AI_MOCK: "1" },
});

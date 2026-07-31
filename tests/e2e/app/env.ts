// App-specific E2E config: loads .env.local for Node-side setup/config (Next
// auto-loads it for the app, but Playwright's config + setup run in plain Node)
// and names the meal-app env vars + test constants.
import path from "node:path";
import { assertAllowedProject } from "./project-guard";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // File absent or already loaded — fall through to whatever is in process.env.
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name} — expected in .env.local for the E2E harness.`
    );
  }
  return v;
}

// Dedicated port: 3000 and 3001 are taken by other local apps. 3102 is ours.
export const E2E_PORT = 3102;

// The dedicated, isolated test identity. Never a real user/household.
export const TEST_USER_EMAIL = "e2e-harness@example.com";
export const TEST_USER_PASSWORD = "e2e-Harness-Pw-7Q2x!";
export const TEST_HOUSEHOLD_NAME = "E2E Test Kitchen";

// The harness needs no service-role key: the test user is bootstrapped over the
// direct Postgres connection (see harness/supabase-session.ts), which works on
// both the legacy-JWT and the new sb_publishable_/sb_secret_ key regimes.
export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  databaseUrl: required("DATABASE_URL"),
};

// BUG-018 · at MODULE LOAD, so nothing — not the seeder, not the web server the
// Playwright config starts — gets as far as opening a connection to a project
// this harness does not recognise. Every entry point that can write already
// imports this module for `databaseUrl`, so there is no path around it.
assertAllowedProject(env.supabaseUrl, env.databaseUrl);

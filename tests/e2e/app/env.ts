// App-specific E2E config: loads .env.local for Node-side setup/config (Next
// auto-loads it for the app, but Playwright's config + setup run in plain Node)
// and names the meal-app env vars + test constants.
import path from "node:path";

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

// Dedicated port: 3000 = FFOS, 3001 = Griffin's manual dev. 3102 is ours.
export const E2E_PORT = 3102;

// The dedicated, isolated test identity. Never a real user/household.
export const TEST_USER_EMAIL = "e2e-harness@example.com";
export const TEST_USER_PASSWORD = "e2e-Harness-Pw-7Q2x!";
export const TEST_HOUSEHOLD_NAME = "E2E Test Kitchen";

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  databaseUrl: required("DATABASE_URL"),
};

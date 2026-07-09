// Bridges the setup project and the specs: the auth setup resolves the test
// user/household ids once and persists them here for the seed helpers to read.
import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.resolve(process.cwd(), "tests/e2e/.auth");
export const STORAGE_STATE_PATH = path.join(AUTH_DIR, "storage-state.json");
const CONTEXT_PATH = path.join(AUTH_DIR, "context.json");

export interface TestContext {
  userId: string;
  householdId: string;
}

export function writeTestContext(ctx: TestContext): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2));
}

export function readTestContext(): TestContext {
  const raw = fs.readFileSync(CONTEXT_PATH, "utf8");
  return JSON.parse(raw) as TestContext;
}

export function writeStorageState(state: unknown): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2));
}

// Environment for the eval suite. Evals call the app's real AI task functions
// directly (no Next server, no database), so the only setup needed is: load the
// keys, decide real-vs-mock, and refuse to run in a state where the results
// would be a lie.
//
// The refusal is the load-bearing part. `getModel()` silently returns a canned
// fixture whenever E2E_AI_MOCK=1, which would make a "real-model" run produce
// perfect scores at zero cost and no network — indistinguishable, in a report,
// from a genuinely passing suite.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { aiMockEnabled } from "@/server/ai/providers/e2e-mock";

export type EvalMode = "real" | "mock";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Parse a .env file into pairs. Deliberately small: KEY=VALUE, # comments, optional quotes. */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Existing process env wins, so `OPENAI_API_KEY=... npm run eval` still overrides the file. */
function loadEnvLocal(): void {
  const file = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(file, "utf8")))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function evalMode(): EvalMode {
  return process.env.EVAL_MOCK === "1" ? "mock" : "real";
}

/**
 * Prepare the process for an eval run. Called once per eval file (idempotent).
 *
 * Returns the mode so a suite can label its own results — a results file that
 * doesn't say which model produced it is not evidence of anything.
 */
export function setupEvalEnv(): EvalMode {
  loadEnvLocal();

  // The AI logger only emits its `[AI] task | model | Nms | A+B tokens` line in
  // development, and that line is how the runner measures real token spend.
  // Assigned through Object.assign because @types/node declares NODE_ENV
  // readonly; nothing else in the code under test branches on it.
  Object.assign(process.env, { NODE_ENV: "development" });

  const mode = evalMode();

  if (mode === "mock") {
    process.env.E2E_AI_MOCK = "1";
    if (!aiMockEnabled()) {
      throw new Error(
        "Eval mock mode requested but aiMockEnabled() is false — is VERCEL set in this shell?"
      );
    }
    return mode;
  }

  // Real mode. An inherited E2E_AI_MOCK from a shell that was running Playwright
  // would otherwise green the entire suite against fixtures.
  delete process.env.E2E_AI_MOCK;
  if (aiMockEnabled()) {
    throw new Error(
      "Refusing to run: the AI mock is active in a real-model eval run. Results would be fixtures, not model output."
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local — evals call the real model by design."
    );
  }
  return mode;
}

/** The judge runs on a different model family than the generator, so its key is separate and optional. */
export function judgeApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

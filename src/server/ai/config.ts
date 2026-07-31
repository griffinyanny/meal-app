import { openai } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { aiMockEnabled, makeE2EMockModel } from "./providers/e2e-mock";

export type AITask =
  | "recipe-generate"
  | "recipe-parse-url"
  | "recipe-modify"
  | "ingredient-normalize"
  | "grocery-talk"
  | "preferences-talk"
  | "plan-generate"
  | "plan-modify"
  | "memory-extract";

const taskModelMap: Record<AITask, () => ReturnType<typeof openai>> = {
  "recipe-generate": () => openai("gpt-4.1-mini"),
  "recipe-parse-url": () => openai("gpt-4.1-mini"),
  "recipe-modify": () => openai("gpt-4.1-mini"),
  "ingredient-normalize": () => openai("gpt-4.1-mini"),
  "grocery-talk": () => openai("gpt-4.1-mini"),
  "preferences-talk": () => openai("gpt-4.1-mini"),
  "plan-generate": () => openai("gpt-4.1-mini"),
  "plan-modify": () => openai("gpt-4.1-mini"),
  "memory-extract": () => openai("gpt-4.1-mini"),
};

// Narrowed to the model OBJECT rather than `ai`'s `LanguageModel` (which also
// admits a bare model-id string): `withStreamRetry` wraps a real model, and both
// branches below already return one.
export function getModel(task: AITask): LanguageModelV3 {
  // E2E test mode: swap in a deterministic mock so the whole pipeline runs
  // against canned output. Double-gated; inert unless explicitly enabled.
  if (aiMockEnabled()) return makeE2EMockModel(task);
  return taskModelMap[task]();
}

export const AI_DEFAULTS = {
  maxRetries: 1,
  timeoutMs: 30_000,
  // Streams surface tokens progressively (plan generation runs 7-20s healthy),
  // so they get a looser bound than one-shot calls. Now used only by the
  // full-week ingredient-normalize batch, which is a ONE-SHOT call borrowing
  // this tier's number — generation itself uses the two values below.
  streamTimeoutMs: 60_000,
  // BUG-035. The old single 60s bound was equal to the route's `maxDuration`,
  // so on Vercel our abort and the platform's kill landed at the same instant
  // and the route had no time left to render its own failure. These two are
  // deliberately chosen against the route's 120s ceiling:
  //
  //   45 + 45 = 90s worst case, 30s of headroom.
  //
  // 45s per attempt is generous against a 7-20s healthy run, so a slow-but-
  // working generation is never cut off — the bound only catches a true stall.
  streamAttemptTimeoutMs: 45_000,
  // Outer safety net across BOTH attempts. Below `maxDuration` so we always fail
  // before the platform kills us; above 2x the attempt bound so it can only fire
  // when something has gone wrong that the per-attempt bound did not catch.
  streamTotalTimeoutMs: 100_000,
  maxTokens: 4096,
} as const;

/**
 * The per-attempt stall bound, with an E2E-only override.
 *
 * Gated on the AI mock so production can never be misconfigured into a short
 * bound by a stray env var: the override exists so a spec can drive a REAL
 * timeout in ~2 seconds instead of 45, which is what makes the retry path
 * testable at all without a 90-second wait in the suite.
 */
export function streamAttemptTimeoutMs(): number {
  if (aiMockEnabled()) {
    const raw = Number(process.env.E2E_AI_ATTEMPT_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) return raw;
  }
  return AI_DEFAULTS.streamAttemptTimeoutMs;
}

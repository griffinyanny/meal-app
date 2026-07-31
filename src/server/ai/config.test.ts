import { readFileSync } from "node:fs";
import { describe, it, expect, afterEach } from "vitest";
import { AI_DEFAULTS, streamAttemptTimeoutMs } from "./config";

// BUG-035's structural lesson, as an assertion.
//
// The bug was not only that a generation stalled — it was that the route's
// `maxDuration` (60) EQUALLED the AI abort (60), so on Vercel the platform's
// kill and our own timeout landed at the same instant and the route never got
// to render its own failure. Nothing anywhere in the codebase said those two
// numbers were related, so nothing could catch them drifting into a tie.
//
// Each layer must be strictly slower than the one it contains:
//
//   attempt (45s) < attempt x2 (90s) < outer AI budget (100s) < maxDuration (120s)
//
// `maxDuration` is SCRAPED from the route source rather than retyped here.
// Importing the route would drag in Supabase, Drizzle and the whole request
// pipeline for one integer; retyping it would give us a test that passes while
// the two numbers disagree, which is the exact class of bug this file exists to
// prevent. Scraping fails loudly if the export is renamed or removed.
function routeMaxDurationSeconds(): number {
  const src = readFileSync(
    new URL("../../app/api/plan/stream/route.ts", import.meta.url),
    "utf8"
  );
  const m = src.match(/^export const maxDuration = (\d+);/m);
  if (!m) throw new Error("plan/stream route no longer exports a literal maxDuration");
  return Number(m[1]);
}

describe("the generation timeout ladder", () => {
  it("should give two attempts room inside the outer AI budget", () => {
    expect(AI_DEFAULTS.streamAttemptTimeoutMs * 2).toBeLessThan(
      AI_DEFAULTS.streamTotalTimeoutMs
    );
  });

  it("should give up before the platform kills the function", () => {
    expect(AI_DEFAULTS.streamTotalTimeoutMs).toBeLessThan(
      routeMaxDurationSeconds() * 1000
    );
  });

  it("should leave a slow-but-healthy generation alone", () => {
    // Healthy runs measured at 7-20s across three Layer B rounds (S45). A bound
    // at or under that range would start failing generations that would have
    // succeeded, turning a rare stall into a common one.
    const SLOWEST_HEALTHY_MS = 20_000;
    expect(AI_DEFAULTS.streamAttemptTimeoutMs).toBeGreaterThan(
      SLOWEST_HEALTHY_MS * 2
    );
  });
});

describe("streamAttemptTimeoutMs", () => {
  afterEach(() => {
    delete process.env.E2E_AI_ATTEMPT_TIMEOUT_MS;
    delete process.env.E2E_AI_MOCK;
  });

  it("should use the real bound by default", () => {
    expect(streamAttemptTimeoutMs()).toBe(AI_DEFAULTS.streamAttemptTimeoutMs);
  });

  it("should IGNORE the override when the AI mock is off, so prod cannot be misconfigured", () => {
    process.env.E2E_AI_ATTEMPT_TIMEOUT_MS = "50";
    expect(streamAttemptTimeoutMs()).toBe(AI_DEFAULTS.streamAttemptTimeoutMs);
  });

  it("should honour the override under the mock, so a spec can drive a real timeout fast", () => {
    process.env.E2E_AI_MOCK = "1";
    process.env.E2E_AI_ATTEMPT_TIMEOUT_MS = "50";
    expect(streamAttemptTimeoutMs()).toBe(50);
  });

  it("should fall back to the real bound on a junk override", () => {
    process.env.E2E_AI_MOCK = "1";
    process.env.E2E_AI_ATTEMPT_TIMEOUT_MS = "not-a-number";
    expect(streamAttemptTimeoutMs()).toBe(AI_DEFAULTS.streamAttemptTimeoutMs);
  });
});

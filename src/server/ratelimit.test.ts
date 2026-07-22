import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The mock flag relaxes the real limits to 1000, which would mask the caps under
// test. Force it off so we exercise the production limits.
vi.mock("@/server/ai/providers/e2e-mock", () => ({
  aiMockEnabled: () => false,
}));

import {
  checkAiRateLimit,
  checkAiBackgroundRateLimit,
  AI_RATE_LIMIT,
  AI_BG_RATE_LIMIT,
} from "./ratelimit";

describe("AI rate limiters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("the background bucket is isolated from the interactive bucket (BUG-004)", () => {
    const user = "user-iso";
    // Exhaust the interactive bucket for this user.
    for (let i = 0; i < AI_RATE_LIMIT.limit; i++) {
      expect(checkAiRateLimit(user).allowed).toBe(true);
    }
    expect(checkAiRateLimit(user).allowed).toBe(false);

    // The background fan-out still has its full, separate allowance — an exhausted
    // interactive bucket can't starve the review-time normalize, and vice versa.
    expect(checkAiBackgroundRateLimit(user).allowed).toBe(true);
  });

  it("a full week of background normalizes stays under the background cap", () => {
    const user = "user-week";
    // A 7-dinner review fans out ~7 normalizes (plus headroom for prioritize
    // re-fires) — comfortably within the background limit.
    for (let i = 0; i < 14; i++) {
      expect(checkAiBackgroundRateLimit(user).allowed).toBe(true);
    }
  });

  it("the background bucket still bounds a runaway loop", () => {
    const user = "user-runaway";
    for (let i = 0; i < AI_BG_RATE_LIMIT.limit; i++) {
      expect(checkAiBackgroundRateLimit(user).allowed).toBe(true);
    }
    expect(checkAiBackgroundRateLimit(user).allowed).toBe(false);
  });
});

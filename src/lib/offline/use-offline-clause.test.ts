import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveClause } from "./use-offline-clause";

// The offline clause's decision, as a table (1F/C, direction 1h).
//
// ⚠️ The one this file exists for is the LAST group. `· sending` must appear
// only for ticks that were actually held — a check-off taken with four bars is
// a pending mutation too, and a naive "online && pending" rule would put the
// clause on screen every single time anyone ticks anything. That is not a
// smaller version of the artifact; it is a different artifact.
describe("resolveClause", () => {
  const base = { isOnline: true, pendingTicks: 0, pausedTicks: 0, wasHolding: false };

  describe("offline", () => {
    it("should say offline with nothing queued", () => {
      expect(resolveClause({ ...base, isOnline: false }).word).toBe("offline");
    });

    it("should still say offline with ticks held, never a count", () => {
      // The queue is deliberately not counted — a running tally invites worry
      // about a promise the app has already kept. The word does not change.
      const three = resolveClause({
        ...base,
        isOnline: false,
        pendingTicks: 3,
        pausedTicks: 3,
      });
      expect(three.word).toBe("offline");
      expect(three.holding).toBe(true);
    });

    it("should keep saying offline if the signal drops again mid-flush", () => {
      expect(
        resolveClause({ ...base, isOnline: false, pendingTicks: 2, wasHolding: true }).word
      ).toBe("offline");
    });
  });

  describe("flushing", () => {
    it("should say sending once a held tick is back online and in flight", () => {
      // The tick has resumed, so it is no longer PAUSED — it is an ordinary
      // pending mutation. Only `wasHolding` remembers where it came from.
      expect(
        resolveClause({ ...base, pendingTicks: 1, pausedTicks: 0, wasHolding: true }).word
      ).toBe("sending");
    });

    it("should resolve to nothing once the last held tick lands", () => {
      const done = resolveClause({ ...base, wasHolding: true });
      expect(done.word).toBeNull();
      expect(done.holding).toBe(false);
    });

    it("should say sending on a cold start that restored a paused tick", () => {
      // A mutation rehydrated from IndexedDB is paused until it resumes, so the
      // relaunch case needs no separate branch: a paused tick starts a hold
      // whether or not this session was ever offline.
      const restored = resolveClause({ ...base, pendingTicks: 1, pausedTicks: 1 });
      expect(restored.holding).toBe(true);
      expect(restored.word).toBe("sending");
    });
  });

  describe("the clause must NOT appear", () => {
    it("should stay silent for an ordinary online check-off", () => {
      // ⚠️ THE ASSERTION THAT MATTERS. Ticking an item with a live connection
      // is a pending mutation, exactly like a flushing one. If this ever goes
      // green with a word in it, the header has grown a second voice on the one
      // screen the artifact exists to keep calm.
      const ordinary = resolveClause({ ...base, pendingTicks: 1 });
      expect(ordinary.word).toBeNull();
      expect(ordinary.holding).toBe(false);
    });

    it("should stay silent after a reconnect with nothing held", () => {
      expect(resolveClause(base).word).toBeNull();
    });

    it("should drop the hold rather than latch it forever", () => {
      // A hold that never clears would leave `· sending` on screen for the rest
      // of the session — the one failure worse than not showing it at all,
      // because it claims work is outstanding that has already landed.
      expect(resolveClause({ ...base, wasHolding: true }).holding).toBe(false);
    });
  });
});

describe("the clause's shape, which no behavioural test can see", () => {
  const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf8");
  const rule = /\.spec-offline-clause\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";

  it("should exist at all", () => {
    expect(rule, ".spec-offline-clause not found in globals.css").toBeTruthy();
  });

  it("should carry NO fill and NO border, or law 05 starts applying to it", () => {
    // The artifact: "meta type, caption colour, no fill and no border — so law
    // 05 never applies and there is nothing to tap, dismiss or ignore." Law 05
    // says fill + border means it MUST respond to a tap. A screenshot cannot
    // catch this (a chip looks deliberate) and no DOM assertion can either,
    // because the markup would be perfectly correct. Only the rule can.
    expect(rule).not.toMatch(/background/);
    expect(rule).not.toMatch(/border/);
  });

  it("should not set colour inside @layer utilities", () => {
    // B8a shipped a utilities-layer class that set `color` and it silently
    // outranked eight call-site overrides, three of them SAFETY-weighted.
    expect(rule).not.toMatch(/(^|[^-])color:/);
  });

  it("should not loop — only the chef loops", () => {
    // One 180ms crossfade and a 180ms exit. An `infinite` here would make the
    // grocery header pulse for as long as a flush takes, which is the chef's
    // vocabulary on a screen the chef is not speaking on.
    expect(rule).not.toMatch(/infinite/);
    expect(rule).toMatch(/--spec-motion-exit/);
  });
});

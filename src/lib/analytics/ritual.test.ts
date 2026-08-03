import { describe, it, expect, beforeEach } from "vitest";
import {
  RITUAL_MAX_AGE_MS,
  RITUAL_STORAGE_KEY,
  advanceRitual,
  completeRitual,
  readRitual,
  startRitual,
  takeAbandonedRitual,
  type RitualStore,
} from "./ritual";

function memoryStore(seed: Record<string, string> = {}): RitualStore & {
  data: Record<string, string>;
} {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const T0 = 1_700_000_000_000;
let n = 0;
const nextId = () => `ritual-${++n}`;

beforeEach(() => {
  n = 0;
});

describe("ritual clock", () => {
  it("mints a ritual and persists it", () => {
    const store = memoryStore();
    const ritual = startRitual(T0, nextId, store);

    expect(ritual).toEqual({ id: "ritual-1", startedAt: T0, lastStep: "started" });
    expect(readRitual(store)).toEqual(ritual);
  });

  it("measures time-to-list across the whole flow and clears on completion", () => {
    const store = memoryStore();
    startRitual(T0, nextId, store);
    advanceRitual("generated", store);
    advanceRitual("confirmed", store);

    const done = completeRitual(T0 + 7 * 60_000, store);

    expect(done?.ritual.id).toBe("ritual-1");
    expect(done?.timeToListMs).toBe(7 * 60_000);
    // Cleared — a refetch or a remount must not report the same ritual twice.
    expect(readRitual(store)).toBeNull();
    expect(completeRitual(T0 + 8 * 60_000, store)).toBeNull();
  });

  it("survives a process restart, which is why it is localStorage", () => {
    const store = memoryStore();
    startRitual(T0, nextId, store);

    // A brand-new store over the same persisted bytes = relaunch after an
    // iOS eviction mid-shop. sessionStorage would be empty here.
    const afterRelaunch = memoryStore({ ...store.data });
    expect(readRitual(afterRelaunch)?.id).toBe("ritual-1");
  });

  it("replaces an in-flight ritual when a new intent is submitted", () => {
    const store = memoryStore();
    startRitual(T0, nextId, store);
    const second = startRitual(T0 + 1000, nextId, store);

    expect(second.id).toBe("ritual-2");
    expect(readRitual(store)?.id).toBe("ritual-2");
  });

  it("reports an abandoned ritual only once it is genuinely stale", () => {
    const store = memoryStore();
    startRitual(T0, nextId, store);
    advanceRitual("generated", store);

    // Same day: still in flight, not abandoned.
    expect(takeAbandonedRitual(T0 + RITUAL_MAX_AGE_MS - 1, store)).toBeNull();
    expect(readRitual(store)).not.toBeNull();

    const abandoned = takeAbandonedRitual(T0 + RITUAL_MAX_AGE_MS + 1, store);
    expect(abandoned?.ritual.lastStep).toBe("generated");
    expect(abandoned?.ageMs).toBe(RITUAL_MAX_AGE_MS + 1);
    // Cleared, so it cannot be reported on every subsequent launch.
    expect(takeAbandonedRitual(T0 + RITUAL_MAX_AGE_MS * 9, store)).toBeNull();
  });

  it("returns null rather than throwing when there is no ritual", () => {
    const store = memoryStore();
    expect(readRitual(store)).toBeNull();
    expect(advanceRitual("confirmed", store)).toBeNull();
    expect(completeRitual(T0, store)).toBeNull();
    expect(takeAbandonedRitual(T0, store)).toBeNull();
  });

  // ⚠️ A half-written or version-skewed record would otherwise poison every
  // downstream duration with a garbage `startedAt` — and a negative or absurd
  // time-to-list is worse than a missing one, because it lands in the DoD
  // average looking like data.
  it("discards a malformed record instead of trusting it", () => {
    for (const bad of [
      "not json at all",
      JSON.stringify({ id: "x" }),
      JSON.stringify({ id: "x", startedAt: "soon", lastStep: "started" }),
      JSON.stringify({ id: "x", startedAt: T0, lastStep: "wandering" }),
      JSON.stringify({ id: "", startedAt: T0, lastStep: "started" }),
      JSON.stringify({ id: "x", startedAt: Number.NaN, lastStep: "started" }),
      JSON.stringify(null),
    ]) {
      const store = memoryStore({ [RITUAL_STORAGE_KEY]: bad });
      expect(readRitual(store), bad).toBeNull();
      expect(store.data[RITUAL_STORAGE_KEY], bad).toBeUndefined();
    }
  });

  it("never reports a negative duration if the clock moved backwards", () => {
    const store = memoryStore();
    startRitual(T0, nextId, store);
    // Device clock correction, DST, or a user changing the time mid-ritual.
    expect(completeRitual(T0 - 60_000, store)?.timeToListMs).toBe(0);
  });

  it("is a no-op with no store rather than throwing (Safari privacy mode)", () => {
    expect(readRitual(null)).toBeNull();
    expect(startRitual(T0, nextId, null).id).toBe("ritual-1");
    expect(completeRitual(T0, null)).toBeNull();
  });
});

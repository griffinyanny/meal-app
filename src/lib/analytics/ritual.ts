// The ritual clock (1F/D3, S63) — how "time-to-list < 10 minutes" becomes a
// query instead of a feeling.
//
// The north-star flow spans four surfaces, a confirm, a background projection
// and possibly a relaunch:
//
//   intent submitted → stream → review → confirm → list pending → hydrate →
//   normalize → aggregate → generationStatus "ready"
//
// ⚠️ There is NO server-side id available at the start. `persistPlan` runs in
// the stream's `onComplete`, so the plan does not exist when the clock starts.
// The correlation key therefore has to be minted client-side, which is what
// this module does.

const STORAGE_KEY = "meal-app:ritual";

/**
 * ⚠️ `localStorage`, NOT `sessionStorage`, and the difference is the whole
 * point. iOS evicts a backgrounded PWA over a long shop — the app-kill replay
 * this project already tests for. `sessionStorage` dies with the tab, so it
 * would lose the clock in exactly the case most worth measuring.
 */
export const RITUAL_STORAGE_KEY = STORAGE_KEY;

/**
 * A ritual older than this that never reached a list is reported as abandoned
 * and cleared. Long enough that "started Sunday morning, confirmed Sunday
 * night" still counts as one ritual; short enough that a stale id cannot
 * attach itself to next week's shop.
 */
export const RITUAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type RitualStep = "started" | "generated" | "confirmed";

export type Ritual = {
  id: string;
  startedAt: number;
  lastStep: RitualStep;
};

/** The `localStorage` surface this module needs, so it is testable in node. */
export interface RitualStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStore(): RitualStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Safari in some privacy modes throws on access rather than returning null.
    return null;
  }
}

function isRitual(value: unknown): value is Ritual {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.startedAt === "number" &&
    Number.isFinite(r.startedAt) &&
    (r.lastStep === "started" ||
      r.lastStep === "generated" ||
      r.lastStep === "confirmed")
  );
}

export function readRitual(store: RitualStore | null = browserStore()): Ritual | null {
  if (!store) return null;
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // A shape we don't recognise is discarded rather than trusted — a
    // half-written or version-skewed record would otherwise poison every
    // downstream duration with a garbage `startedAt`.
    if (!isRitual(parsed)) {
      store.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    store.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeRitual(ritual: Ritual, store: RitualStore | null): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(ritual));
  } catch {
    // Quota or privacy mode. A ritual we cannot persist is one we cannot
    // measure, and that is strictly better than throwing inside a submit
    // handler on the app's front door.
  }
}

/**
 * Start the clock. Replaces any ritual in flight — submitting a new intent IS
 * abandoning the previous attempt, and the old one is reported separately on
 * next launch if it never landed.
 */
export function startRitual(
  now: number,
  newId: () => string,
  store: RitualStore | null = browserStore()
): Ritual {
  const ritual: Ritual = { id: newId(), startedAt: now, lastStep: "started" };
  writeRitual(ritual, store);
  return ritual;
}

/** Record how far the ritual got, so an abandonment says where it died. */
export function advanceRitual(
  step: RitualStep,
  store: RitualStore | null = browserStore()
): Ritual | null {
  const current = readRitual(store);
  if (!current) return null;
  const next: Ritual = { ...current, lastStep: step };
  writeRitual(next, store);
  return next;
}

/**
 * The list landed. Returns the ritual and its elapsed time, and clears it —
 * so a second `list_ready` (a refetch, a remount, a second device) cannot
 * report the same ritual twice.
 */
export function completeRitual(
  now: number,
  store: RitualStore | null = browserStore()
): { ritual: Ritual; timeToListMs: number } | null {
  const current = readRitual(store);
  if (!current) return null;
  store?.removeItem(STORAGE_KEY);
  return { ritual: current, timeToListMs: Math.max(0, now - current.startedAt) };
}

/**
 * A ritual that started and never reached a list.
 *
 * ⚠️ Not garnish. Without it, "< 10 minutes" is computed only over rituals that
 * FINISHED — survivor bias with a number attached. The DoD deserves its
 * denominator.
 *
 * Called once at launch. Returns null when there is nothing to report, so the
 * caller sends `ritual_abandoned` only when it is real.
 */
export function takeAbandonedRitual(
  now: number,
  store: RitualStore | null = browserStore()
): { ritual: Ritual; ageMs: number } | null {
  const current = readRitual(store);
  if (!current) return null;

  const ageMs = now - current.startedAt;
  if (ageMs < RITUAL_MAX_AGE_MS) return null;

  store?.removeItem(STORAGE_KEY);
  return { ritual: current, ageMs };
}

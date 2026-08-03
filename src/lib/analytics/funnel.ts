// The north-star funnel (1F/D3, S63) — the five events the DoD's
// "time-to-list < 10 minutes on a real week" is computed from.
//
// These wrap `./ritual` so call sites stay one-liners and the correlation
// plumbing lives in one tested place rather than being re-derived on four
// surfaces.
//
// ⚠️ Every one of these NO-OPS when there is no ritual in flight, deliberately.
// Opening the Groceries tab on last week's list must not report a `list_ready`
// with a fabricated duration — a missing measurement is honest, an invented
// one lands in the DoD average looking like data.

import { track } from ".";
import {
  advanceRitual,
  completeRitual,
  readRitual,
  startRitual,
} from "./ritual";
import type { RitualEntry } from "./events";

function now(): number {
  return Date.now();
}

function newId(): string {
  // `crypto.randomUUID` needs a secure context; every browser this app targets
  // has it over https, and the fallback keeps localhost-over-http working
  // rather than throwing inside the app's front-door submit handler.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Intent submitted. Starts the clock and returns the ritual id. */
export function trackRitualStarted(args: {
  entry: RitualEntry;
  hasRequest: boolean;
  pickedCount: number;
}): string {
  const ritual = startRitual(now(), newId);
  track("ritual_started", {
    ritual_id: ritual.id,
    entry: args.entry,
    has_request: args.hasRequest,
    picked_count: args.pickedCount,
  });
  return ritual.id;
}

/** A week arrived. */
export function trackPlanGenerated(args: {
  mealCount: number;
  durationMs: number;
  pickedCount: number;
}): void {
  const ritual = advanceRitual("generated");
  if (!ritual) return;
  track("plan_generated", {
    ritual_id: ritual.id,
    meal_count: args.mealCount,
    duration_ms: args.durationMs,
    picked_count: args.pickedCount,
  });
}

/**
 * No week arrived.
 *
 * ⚠️ The client can only ever report `client_stream_died` here, and that is
 * BUG-035's lesson rather than laziness: the route has already returned 200
 * with an open body by the time a generation can stall, so a dead stream
 * reaches the browser as a body that simply closes. The real reason is
 * reported separately by the server sink.
 */
export function trackPlanGenerationFailed(durationMs: number): void {
  const ritual = readRitual();
  if (!ritual) return;
  track("plan_generation_failed", {
    ritual_id: ritual.id,
    reason: "client_stream_died",
    duration_ms: durationMs,
  });
}

/** The week was accepted — the point the grocery projection starts building. */
export function trackPlanConfirmed(args: {
  mealCount: number;
  daysCovered: number;
  wasModified: boolean;
}): void {
  const ritual = advanceRitual("confirmed");
  if (!ritual) return;
  track("plan_confirmed", {
    ritual_id: ritual.id,
    meal_count: args.mealCount,
    days_covered: args.daysCovered,
    was_modified: args.wasModified,
  });
}

/**
 * The list is shoppable. Ends the ritual and emits the DoD number.
 *
 * Clearing is what stops a refetch, a remount or a second device from
 * reporting the same ritual twice — see `completeRitual`.
 */
export function trackListReady(args: {
  itemCount: number;
  sectionCount: number;
  generationMs: number;
}): void {
  const done = completeRitual(now());
  if (!done) return;
  track("list_ready", {
    ritual_id: done.ritual.id,
    item_count: args.itemCount,
    section_count: args.sectionCount,
    generation_ms: args.generationMs,
    time_to_list_ms: done.timeToListMs,
  });
}

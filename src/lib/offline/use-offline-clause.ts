"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";

// The offline clause (1F/C, direction 1h "The clause") — LOCKED by the S60
// design round. docs/design/surfaces/pwa/directions.dc.html → Artifact 04.
//
// Offline is announced ONCE, in ONE place: four characters appended to the count
// the Groceries header already shows. `18 / 34 · offline`. That is the entire
// treatment. No banner, no strip, no per-row badge, no second sentence.
//
// ⚠️ THE QUEUE IS DELIBERATELY NOT COUNTED. A running tally invites worry about
// a promise the app has already kept, so this hook exposes a WORD and never a
// number — and if you find yourself wanting `heldCount` out of it, that is the
// design being reopened, not an omission.
//
// ⚠️ AND FLUSHING NEVER LOOPS. Only the chef loops. One 180ms crossfade to a
// different word, then a 180ms exit. If the flush takes four seconds the word
// just sits there — no spin, no pulse, no shimmer.

/** The tRPC mutation key for a check-off — the same one the persister replays. */
const TICK_KEY: readonly unknown[] = [["grocery", "checkItem"]];

/**
 * How long `· sending` stays legible once it appears.
 *
 * ⚠️ Not in the design, and it exists to serve it rather than to bend it. The
 * artifact specifies a 180ms crossfade IN and a 180ms exit; a flush that lands
 * in 80ms would remove the word before its own fade-in finished, which reads as
 * a twitch — and "its exit is the loudest thing in a calm forty minutes" is the
 * frame's whole argument against a strip. So the word is held long enough to be
 * read once. It is a floor on VISIBILITY, never on the flush: the ticks go up
 * the instant the network allows, and nothing waits on this.
 */
export const MIN_SENDING_MS = 600;

/** Matches `--spec-motion-exit`, which is the 180ms the artifact specifies. */
export const CLAUSE_EXIT_MS = 180;

export type ClauseWord = "offline" | "sending";

export interface ClauseState {
  word: ClauseWord;
  /** True for the 180ms exit, so the word can fade rather than vanish. */
  leaving: boolean;
}

/**
 * The decision, with no timers in it, so it can be tested as a table.
 *
 * `holding` is the memory that survives the transition: a tick taken offline is
 * PAUSED, and on reconnect it becomes an ordinary pending mutation — identical,
 * from the outside, to someone ticking an item with four bars of signal. Without
 * this flag the clause would say `· sending` on every check-off the app ever
 * makes, which is emphatically not the design.
 */
export function resolveClause(input: {
  isOnline: boolean;
  pendingTicks: number;
  pausedTicks: number;
  wasHolding: boolean;
}): { word: ClauseWord | null; holding: boolean } {
  // A paused tick is the only thing that ever starts a hold. It also covers the
  // cold-start case for free: a mutation restored from IndexedDB is paused until
  // it resumes, so a relaunch mid-flush says `· sending` rather than nothing.
  const holding = input.pausedTicks > 0
    ? true
    : input.isOnline && input.pendingTicks === 0
      ? false
      : input.wasHolding;

  // Offline wins over sending. You cannot be flushing on a dead network, and if
  // the signal drops again mid-flush the honest word is the one about now.
  if (!input.isOnline) return { word: "offline", holding };
  return { word: holding ? "sending" : null, holding };
}

/**
 * Drives the clause off React Query's own `onlineManager` and mutation cache.
 *
 * ⚠️ Deliberately NOT `navigator.onLine`. `onlineManager` is the thing that
 * decides whether a mutation pauses, so reading it is the only way the word and
 * the queue cannot disagree — and disagreeing is the failure that matters here:
 * a header saying `· offline` over ticks that are quietly being sent, or worse,
 * saying nothing over ticks that are quietly not.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(() => cb()),
    () => onlineManager.isOnline(),
    // ⚠️ The server snapshot is ONLINE, and that is load-bearing rather than a
    // default. The service worker caches this shell HTML, so anything rendered
    // on the server for the offline case would be baked into the cache and
    // served back on a launch that may be perfectly connected — a lie with a
    // very long shelf life.
    () => true
  );
}

export function useOfflineClause(): ClauseState | null {
  const isOnline = useIsOnline();

  const tickPauses = useMutationState({
    filters: { mutationKey: TICK_KEY, status: "pending" },
    select: (mutation) => mutation.state.isPaused,
  });

  const [state, setState] = useState<ClauseState | null>(null);
  const holdingRef = useRef(false);
  const wordRef = useRef<ClauseWord | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingTicks = tickPauses.length;
  const pausedTicks = tickPauses.filter(Boolean).length;

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    clear();

    const { word, holding } = resolveClause({
      isOnline,
      pendingTicks,
      pausedTicks,
      wasHolding: holdingRef.current,
    });
    holdingRef.current = holding;

    if (word) {
      // Only restart the visibility clock when the WORD changes, or a render
      // during the flush would keep pushing the minimum hold out ahead of it.
      if (wordRef.current !== word) {
        wordRef.current = word;
        shownAtRef.current = Date.now();
      }
      setState((s) => (s && s.word === word && !s.leaving ? s : { word, leaving: false }));
      return clear;
    }

    if (wordRef.current === null) return clear;

    // Resolving to nothing. The resolution is an ABSENCE — nothing confirms,
    // nothing lands, nothing needs dismissing — but it still gets its 180ms
    // rather than blinking out, and `· sending` gets read once first.
    const wait =
      wordRef.current === "sending"
        ? Math.max(0, MIN_SENDING_MS - (Date.now() - shownAtRef.current))
        : 0;

    timerRef.current = setTimeout(() => {
      setState((s) => (s && !s.leaving ? { ...s, leaving: true } : s));
      timerRef.current = setTimeout(() => {
        wordRef.current = null;
        setState(null);
      }, CLAUSE_EXIT_MS);
    }, wait);

    return clear;
  }, [isOnline, pendingTicks, pausedTicks]);

  return state;
}

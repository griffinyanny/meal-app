"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { PreferencesPatch } from "@/components/you/use-you-mutations";

// The interview's persistence path, split out of use-onboarding so that file
// stays under the 300-line rule.
//
// Each core turn saves as it's confirmed, so abandoning halfway still leaves the
// chef knowing what it was told. The cost of that design is that a save can fail
// on a turn the user has already walked away from — and the interview fires
// exactly ONCE per account (both complete and skip set onboardingCompletedAt),
// so a half-saved first run is not something the user can re-run their way out
// of. This hook is what keeps that from happening silently (BUG-016): a failure
// is named when it happens, remembered, retried at the natural end point, and
// never allowed to be reported as "All saved".

export interface FailedSave {
  // The answer in the user's terms ("what to never cook with"), used in both the
  // toast and the reflect screen's honest line. Also the dedupe key: answering
  // the same turn twice replaces the earlier failure rather than queueing two.
  label: string;
  patch: PreferencesPatch;
}

export interface CoreSaves {
  persist: (label: string, patch: PreferencesPatch) => void;
  // Resolves true when nothing is outstanding. Called before finishOnboarding,
  // because by then a transient drop has usually healed.
  retryFailed: () => Promise<boolean>;
  failedSaves: FailedSave[];
  // True only during retryFailed. Scoped this narrowly on purpose: a per-turn
  // save must never disable anything, or every answer gets a stutter.
  isRetrying: boolean;
}

export function useCoreSaves(showToast: (message: string) => void): CoreSaves {
  const savePreferences = trpc.user.updatePreferences.useMutation();
  const [failedSaves, setFailedSaves] = useState<FailedSave[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  // BUG-020 · THE THIRD BUCKET.
  //
  // `retryFailed` used to answer "is anything outstanding?" by checking
  // `failedSaves` alone — but a save still in flight has neither succeeded nor
  // failed, so it was in NEITHER bucket and the answer came back "all clear"
  // over a write that had not landed. Tap through the last core turn fast
  // enough and the completed flag was written, the interview stopped firing,
  // and the pending save then failed with nothing left to retry.
  //
  // Every settled promise lands here so the end point can await them.
  const inFlight = useRef(new Set<Promise<void>>());

  // Mirrors `failedSaves` synchronously. `retryFailed` awaits in-flight saves
  // and then has to read the failures THOSE saves just produced — but a setState
  // from an awaited callback is not visible to the closure that awaited it, so
  // reading state there would see the array as it was before the await and
  // report success over a save that had just failed. The ref is the readable
  // copy; the state exists to re-render the reflect screen's honest line.
  const failedRef = useRef<FailedSave[]>([]);
  const writeFailed = useCallback(
    (next: (current: FailedSave[]) => FailedSave[]) => {
      failedRef.current = next(failedRef.current);
      setFailedSaves(failedRef.current);
    },
    []
  );

  const persist = useCallback(
    (label: string, patch: PreferencesPatch) => {
      // Deliberately does NOT block the turn. Waiting on a round trip before
      // every advance would trade a rare, now-visible failure for a stutter on
      // every single answer. Tracked rather than awaited, so the interview keeps
      // its pace AND the end point still knows this is outstanding.
      const settled = savePreferences.mutateAsync(patch).then(
        () => writeFailed((f) => f.filter((x) => x.label !== label)),
        () => {
          writeFailed((f) => [
            ...f.filter((x) => x.label !== label),
            { label, patch },
          ]);
          showToast(`I didn't get ${label} saved. I'll try again at the end.`);
        }
      );
      inFlight.current.add(settled);
      // Both outcomes are handled above, so `settled` never rejects and the
      // awaiting end point cannot be taken down by a failed save.
      settled.finally(() => inFlight.current.delete(settled));
    },
    [savePreferences, showToast, writeFailed]
  );

  const retryFailed = useCallback(async () => {
    // Land anything still open BEFORE deciding whether anything failed. This
    // ordering is the entire fix: the old code asked the question first.
    if (inFlight.current.size > 0) {
      setIsRetrying(true);
      await Promise.all([...inFlight.current]);
    }

    if (failedRef.current.length === 0) {
      setIsRetrying(false);
      return true;
    }

    setIsRetrying(true);
    const stillFailing: FailedSave[] = [];
    for (const failed of failedRef.current) {
      try {
        await savePreferences.mutateAsync(failed.patch);
      } catch {
        stillFailing.push(failed);
      }
    }
    writeFailed(() => stillFailing);
    setIsRetrying(false);
    return stillFailing.length === 0;
  }, [savePreferences, writeFailed]);

  return { persist, retryFailed, failedSaves, isRetrying };
}

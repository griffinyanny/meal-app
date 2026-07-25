"use client";

import { useCallback, useState } from "react";
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

  const persist = useCallback(
    (label: string, patch: PreferencesPatch) => {
      // Deliberately does NOT block the turn. Waiting on a round trip before
      // every advance would trade a rare, now-visible failure for a stutter on
      // every single answer.
      savePreferences.mutate(patch, {
        onSuccess: () =>
          setFailedSaves((f) => f.filter((x) => x.label !== label)),
        onError: () => {
          setFailedSaves((f) => [
            ...f.filter((x) => x.label !== label),
            { label, patch },
          ]);
          showToast(`I didn't get ${label} saved. I'll try again at the end.`);
        },
      });
    },
    [savePreferences, showToast]
  );

  const retryFailed = useCallback(async () => {
    if (failedSaves.length === 0) return true;
    setIsRetrying(true);
    const stillFailing: FailedSave[] = [];
    for (const failed of failedSaves) {
      try {
        await savePreferences.mutateAsync(failed.patch);
      } catch {
        stillFailing.push(failed);
      }
    }
    setFailedSaves(stillFailing);
    setIsRetrying(false);
    return stillFailing.length === 0;
  }, [failedSaves, savePreferences]);

  return { persist, retryFailed, failedSaves, isRetrying };
}

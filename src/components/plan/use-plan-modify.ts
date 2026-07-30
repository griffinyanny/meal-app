"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { type DisplayMeal, workingLabel } from "./plan-helpers";
import type { SlotToast } from "./rail/floating-slot";

// Scroll to a day the chef touched. Meal rows AND absent rail rows both carry
// `data-meal-date`, so a night cleared to "You're out" — the change that is
// hardest to notice — is reachable by the same query.
function scrollToMealDate(date: string | null): void {
  if (!date) return;
  document
    .querySelector(`[data-meal-date="${date}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Which surface fired the modify. Used to scope the pending/error state to the
// right sheet (so an unrelated open sheet doesn't show another day's progress)
// and to close only the initiating sheet on success.
// "inline" is gone: the rail moved the chips off the card, so there is no
// longer a modify that starts anywhere but a sheet. "day" is the day sheet
// (§D, `1l`), which asks about the whole day rather than one dish.
// "picker" is W8's: the person handed over a recipe rather than asking in words.
// It is a source and not a separate machine because what lands is the same thing
// — a rewritten week, a toast, and rows to highlight.
export type ModifySource = "chat" | "expanded" | "day" | "picker";

interface Pending {
  date: string | null;
  label: string;
  source: ModifySource;
}

interface ModifyError {
  message: string;
  source: ModifySource;
  /**
   * How to run the same ask again.
   *
   * A closure rather than the request string, because a pick's ask is a list of
   * recipe ids and a modify's is a sentence — and a retry that had to
   * reconstruct which of those it was would be a third place the two could
   * diverge.
   */
  replay: () => void;
}

export interface PlanModify {
  pending: Pending | null;
  changedDates: string[];
  ack: { text: string; firstDate: string | null } | null;
  modifyError: ModifyError | null;
  /** The action bar's slot when it isn't the primary — null when it is. */
  toast: SlotToast | null;
  runModify: (
    request: string,
    scope: DisplayMeal | null,
    source: ModifySource
  ) => void;
  /** W8 · hand the chef recipes instead of a sentence. Same landing, same toast. */
  runPick: (recipeIds: string[], replacingDate: string | null) => void;
  retry: () => void;
  cancelInFlight: () => void;
  dismissAck: () => void;
  clearError: () => void;
}

// The AI-working affordance state machine (shared, so future tabs can adopt it):
// a modify shows pending where the user is looking, highlights the changed day
// when it lands, and narrates whole-week changes in a scroll-independent pill.
// `onDone(source)` closes the initiating sheet on success.
export function usePlanModify(
  onDone: (source: ModifySource) => void
): PlanModify {
  const utils = trpc.useUtils();
  const [pending, setPending] = useState<Pending | null>(null);
  const [changedDates, setChangedDates] = useState<string[]>([]);
  const [ack, setAck] = useState<{ text: string; firstDate: string | null } | null>(
    null
  );
  const [modifyError, setModifyError] = useState<ModifyError | null>(null);
  // Monotonic token: a fresh generation (or a superseding action) bumps it so a
  // late modify response can't clobber a plan the user has since replaced.
  const token = useRef(0);
  const modifyMutation = trpc.plan.modify.useMutation();
  const pickMutation = trpc.plan.pick.useMutation();
  // BUILD DEPENDENCY 4 — WARM THE NORMALIZE CACHE AT PICK TIME, NOT AT CONFIRM.
  //
  // A library recipe may have no `normalized_ingredients`, and confirm is the one
  // moment in the product where an AI round-trip is unaffordable — the exact
  // latency BUG-004 exists to prevent. `bgAiProcedure` puts this on its own
  // 30/min bucket so it can never 429 a user-visible call, and it is idempotent,
  // so firing it on a recipe that is already cached costs one no-op query.
  const normalizeMutation = trpc.plan.normalizeSlot.useMutation();

  // The changed-day highlight is a one-shot flash; clear it once it has faded.
  useEffect(() => {
    if (changedDates.length === 0) return;
    const t = setTimeout(() => setChangedDates([]), 1600);
    return () => clearTimeout(t);
  }, [changedDates]);

  // The whole-week ack pill is transient.
  useEffect(() => {
    if (!ack) return;
    const t = setTimeout(() => setAck(null), 4500);
    return () => clearTimeout(t);
  }, [ack]);

  function runModify(
    request: string,
    scope: DisplayMeal | null,
    source: ModifySource
  ) {
    if (pending) return; // one active plan → one active modify
    setModifyError(null);
    const date = scope?.date ?? null;
    const issued = ++token.current;
    setPending({ date, label: workingLabel(scope), source });
    modifyMutation.mutate(
      { request },
      {
        onSuccess: (data) => {
          if (issued !== token.current) return; // superseded — ignore
          // Swap the authoritative plan in immediately (matching the feedback
          // pattern) so the change lands in the same beat as the highlight,
          // then invalidate to reconcile any cache drift. The refetch returns
          // identical data, so it doesn't restart the highlight animation.
          utils.plan.current.setData(undefined, () => data.plan);
          utils.plan.current.invalidate();
          setChangedDates(data.changedDates);
          // Scoped change → the changed card IS the acknowledgment. Whole-week
          // change lands on an unknown/off-screen day → narrate it in the pill.
          if (date === null) {
            setAck({
              text: data.chefResponse,
              firstDate: data.changedDates[0] ?? null,
            });
          }
          setPending(null);
          onDone(source);
        },
        onError: () => {
          if (issued !== token.current) return;
          setPending(null);
          setModifyError({
            message: "That didn't take — try again?",
            source,
            replay: () => runModify(request, scope, source),
          });
        },
      }
    );
  }

  function runPick(recipeIds: string[], replacingDate: string | null) {
    if (pending) return; // one active plan → one active change
    setModifyError(null);
    const issued = ++token.current;
    setPending({
      date: replacingDate,
      label: "Working it into your week…",
      source: "picker",
    });
    pickMutation.mutate(
      {
        recipeIds,
        ...(replacingDate ? { replacingDate } : {}),
      },
      {
        onSuccess: (data) => {
          if (issued !== token.current) return;
          utils.plan.current.setData(undefined, () => data.plan);
          utils.plan.current.invalidate();
          setChangedDates(data.changedDates);
          // ALWAYS narrated, even when a night was named. The chef answering
          // with a night IS the payoff of a pick (§B), and a person who tapped
          // a recipe and got a silently rewritten row would never learn which
          // night it landed on or why.
          setAck({
            text: data.chefResponse,
            firstDate: data.changedDates[0] ?? null,
          });
          setPending(null);
          onDone("picker");

          // Fire-and-forget, after the week is on screen: the person is reading
          // the placement while this fills the cache confirm would otherwise pay
          // for. A failure here is a no-op — confirm re-normalizes that one
          // recipe, which is the pre-W8 behaviour rather than a regression.
          for (const slot of data.plan.slots) {
            if (slot.pickedRecipeId && data.changedDates.includes(slot.date)) {
              normalizeMutation.mutate({ slotId: slot.id });
            }
          }
        },
        onError: () => {
          if (issued !== token.current) return;
          setPending(null);
          setModifyError({
            message: "That didn't take — try again?",
            source: "picker",
            replay: () => runPick(recipeIds, replacingDate),
          });
        },
      }
    );
  }

  function retry() {
    const err = modifyError;
    if (!err) return;
    setModifyError(null);
    err.replay();
  }

  // Abandon any in-flight modify result — called when a fresh generation starts
  // so a stale response can't overwrite the newly generated plan.
  function cancelInFlight() {
    token.current++;
    setPending(null);
    setAck(null);
    setModifyError(null);
  }

  // THE ACTION BAR BECOMES THE MESSAGE (§C). The slot has exactly one occupant,
  // so this is one derived value rather than three pills racing on z-index.
  //
  // Priority is error → working → ack, because each is newer news than the one
  // below it, and an error must never end up buried under an acknowledgement of
  // something that then failed. An error is also the only one that does not time
  // out: it carries the retry, so dismissing it on a timer would hide the only
  // way back.
  const toast: SlotToast | null = modifyError
    ? {
        message: modifyError.message,
        tone: "error",
        action: { label: "Retry", onClick: retry },
      }
    : pending
      ? { message: pending.label }
      : ack
        ? {
            message: ack.text,
            action: ack.firstDate
              ? {
                  label: "Show me",
                  onClick: () => {
                    scrollToMealDate(ack.firstDate);
                    setAck(null);
                  },
                }
              : undefined,
          }
        : null;

  return {
    pending,
    changedDates,
    ack,
    modifyError,
    toast,
    runModify,
    runPick,
    retry,
    cancelInFlight,
    dismissAck: () => setAck(null),
    clearError: () => setModifyError(null),
  };
}

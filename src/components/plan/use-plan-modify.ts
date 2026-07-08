"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { type DisplayMeal, workingLabel } from "./plan-helpers";

// Which surface fired the modify. Used to scope the pending/error state to the
// right sheet (so an unrelated open sheet doesn't show another day's progress)
// and to close only the initiating sheet on success.
export type ModifySource = "inline" | "chat" | "expanded";

interface Pending {
  date: string | null;
  label: string;
  source: ModifySource;
}

interface ModifyError {
  message: string;
  request: string;
  scope: DisplayMeal | null;
  source: ModifySource;
}

export interface PlanModify {
  pending: Pending | null;
  changedDates: string[];
  ack: { text: string; firstDate: string | null } | null;
  modifyError: ModifyError | null;
  runModify: (
    request: string,
    scope: DisplayMeal | null,
    source: ModifySource
  ) => void;
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
            request,
            scope,
            source,
          });
        },
      }
    );
  }

  function retry() {
    const err = modifyError;
    if (!err) return;
    setModifyError(null);
    runModify(err.request, err.scope, err.source);
  }

  // Abandon any in-flight modify result — called when a fresh generation starts
  // so a stale response can't overwrite the newly generated plan.
  function cancelInFlight() {
    token.current++;
    setPending(null);
    setAck(null);
    setModifyError(null);
  }

  return {
    pending,
    changedDates,
    ack,
    modifyError,
    runModify,
    retry,
    cancelInFlight,
    dismissAck: () => setAck(null),
    clearError: () => setModifyError(null),
  };
}

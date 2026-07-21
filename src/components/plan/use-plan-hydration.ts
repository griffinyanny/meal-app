"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { type DisplayMeal, type HydrationView, isCookable } from "./plan-helpers";

export interface PlanHydration {
  // Keyed by slot date (one dinner per day in V1), mirroring the modify
  // affordance so cards can be addressed the same way.
  hydrationByDate: Record<string, HydrationView>;
  // Jump a slot to the front of the walk (and retry it if it failed) — used when
  // the user opens a meal so its full recipe is ready fastest.
  prioritize: (slotId: string | null | undefined) => void;
}

function needsHydration(m: DisplayMeal): boolean {
  return (
    !!m.id &&
    isCookable(m.slotType) &&
    // Don't spend budget hydrating days already in the past (mid-week view) —
    // they're cooked/gone and the grocery list was projected at confirm.
    m.timeframe !== "past" &&
    (m.recipeStatus === "none" || m.recipeStatus === "stale")
  );
}

// Background hydration walker. Turns each cookable slot's concept into a full
// recipe during Plan review, day-1-first and one at a time (gentler on the AI
// budget than a parallel burst), and patches each result into the plan cache so
// cards go shimmer → ready with no refetch. Idempotent + race-safe on the server
// (see plan-hydrate.ts), so a re-mount or a second tab can't double-generate.
export function usePlanHydration(
  meals: DisplayMeal[],
  enabled: boolean
): PlanHydration {
  const utils = trpc.useUtils();
  const hydrate = trpc.plan.hydrateSlot.useMutation();

  // Slot ids that failed this session — not auto-retried (a persistently-failing
  // slot would otherwise burn budget in a loop); a manual prioritize() clears it.
  const [failed, setFailed] = useState<Record<string, true>>({});
  // Which slot is generating right now — a ref so it can't be double-claimed
  // within a render, plus a tick to re-run the picker after each one settles.
  const activeRef = useRef<string | null>(null);
  const priorityRef = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  const prioritize = useCallback((slotId: string | null | undefined) => {
    if (!slotId) return;
    priorityRef.current = slotId;
    setFailed((f) => {
      if (!f[slotId]) return f;
      const next = { ...f };
      delete next[slotId];
      return next;
    });
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled || activeRef.current) return;

    const eligible = meals.filter(
      (m) => needsHydration(m) && !failed[m.id!]
    );
    if (eligible.length === 0) return;

    const priority = priorityRef.current;
    const target =
      (priority && eligible.find((m) => m.id === priority)) ||
      // day-1-first
      [...eligible].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];

    const slotId = target?.id;
    if (!slotId) return;
    if (priorityRef.current === slotId) priorityRef.current = null;

    activeRef.current = slotId;
    hydrate.mutate(
      { slotId },
      {
        onSuccess: (res) => {
          // Patch just this slot in the plan cache — no invalidate, so the walk
          // doesn't trigger a refetch storm and modify's optimistic state is
          // untouched. The card + meal sheet read recipeStatus/recipeId off here.
          utils.plan.current.setData(undefined, (old) =>
            old
              ? {
                  ...old,
                  slots: old.slots.map((s) =>
                    s.id === res.slotId
                      ? {
                          ...s,
                          recipeId: res.recipeId,
                          recipeStatus: res.recipeStatus,
                        }
                      : s
                  ),
                }
              : old
          );
        },
        onError: () => {
          setFailed((f) => ({ ...f, [slotId]: true }));
        },
        onSettled: () => {
          activeRef.current = null;
          setTick((t) => t + 1);
        },
      }
    );
    // hydrate/utils are stable tRPC handles; re-run on slot changes + each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, meals, failed, tick]);

  const hydrationByDate = useMemo<Record<string, HydrationView>>(() => {
    const map: Record<string, HydrationView> = {};
    for (const m of meals) {
      if (!m.date || !isCookable(m.slotType)) continue;
      if (m.id && failed[m.id]) map[m.date] = "failed";
      else if (m.recipeStatus === "ready") map[m.date] = "ready";
      else if (enabled && m.timeframe !== "past") map[m.date] = "writing";
      else map[m.date] = "idle";
    }
    return map;
  }, [meals, failed, enabled]);

  return { hydrationByDate, prioritize };
}

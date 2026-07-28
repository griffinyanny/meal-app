"use client";

import { useMemo, useState } from "react";
import type { DisplayMeal } from "./plan-helpers";
import { groupIntoDays } from "./rail-helpers";
import type { PlanSheetTarget } from "./sheet/plan-sheet";

export interface PlanSheet {
  /** The live subject of the sheet, re-resolved from the plan every render. */
  target: PlanSheetTarget | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMeal: (meal: DisplayMeal) => void;
  openDay: (date: string) => void;
  close: () => void;
  /** The meal on screen, when there is one — for hydration and scoping. */
  meal: DisplayMeal | null;
}

/**
 * Which Plan sheet is open, and what it is about.
 *
 * ONE SHEET, TWO SUBJECTS (§D, `1l`). The subject is stored as an id or a date
 * rather than as the object itself, and re-resolved from `meals` on every
 * render — so a modify landing under an open sheet rewrites what you are
 * reading instead of leaving a stale snapshot, and a slot that disappears
 * (regenerated away, cleared to a night out) closes the sheet rather than
 * showing a meal the plan no longer contains.
 */
export function usePlanSheet(meals: DisplayMeal[]): PlanSheet {
  const [subject, setSubject] = useState<
    { kind: "meal"; id: string } | { kind: "day"; date: string } | null
  >(null);
  const [open, setOpen] = useState(false);

  const target = useMemo<PlanSheetTarget | null>(() => {
    if (!subject) return null;
    if (subject.kind === "meal") {
      const meal = meals.find((m) => m.id === subject.id);
      return meal ? { kind: "meal", meal } : null;
    }
    const day = groupIntoDays(meals).find((d) => d.date === subject.date);
    return day ? { kind: "day", day } : null;
  }, [subject, meals]);

  return {
    target,
    open,
    setOpen,
    openMeal: (meal) => {
      if (!meal.id) return;
      setSubject({ kind: "meal", id: meal.id });
      setOpen(true);
    },
    openDay: (date) => {
      setSubject({ kind: "day", date });
      setOpen(true);
    },
    close: () => setOpen(false),
    meal: target?.kind === "meal" ? target.meal : null,
  };
}

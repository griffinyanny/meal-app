"use client";

import { useEffect, useState } from "react";
import type { DisplayMeal } from "./plan-helpers";
import { writtenCount, waitingMessage } from "./rail-helpers";
import { ChefHeader } from "./rail/chef-header";
import { PlanRail } from "./rail/plan-rail";
import { CountSlot, WaitingSlot, SLOT_PADDING_BARE } from "./rail/floating-slot";

// Ticks once a second for as long as generation is on screen. Mounted only
// while streaming, so it stops on its own when the plan lands or fails.
function useElapsedMs(): number {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, []);
  return elapsedMs;
}

export interface StreamingPlanProps {
  chefSummary?: string;
  chefNote?: string | null;
  meals: DisplayMeal[];
  weekStart: string;
  /** Every night the user asked for, known before generation starts. */
  plannedDates?: string[];
}

/**
 * Generation.
 *
 * GENERATION IS THE PROVISIONAL ROW, REPEATED (ledger §C). There is no separate
 * streaming vocabulary and no skeleton: the full rail arrives in the first
 * second with every chosen day present, then resolves in place. Four rules make
 * that free —
 *
 *   - the rail is complete from the first frame, because the days and the
 *     nights off are known before any generation happens; only the dish is late
 *   - a pending slot is the provisional row verbatim, so resolution changes
 *     text and fill only and NOTHING REFLOWS
 *   - the sentence is specific ("Friday, after Wednesday") — the dependency is
 *     real information the scheduler already has, and it beats three identical
 *     placeholders
 *   - the floating slot holds a COUNT, NOT A CONTROL: there is nothing to
 *     confirm yet, and a progress bar would claim a precision the model does
 *     not have
 */
export function StreamingPlan({
  chefSummary,
  chefNote,
  meals,
  weekStart,
  plannedDates,
}: StreamingPlanProps) {
  // Every chosen night is on screen from the first frame. Dates the user asked
  // for that have no meal yet become provisional rows rather than absences —
  // this is the one place a missing day is "not written yet" instead of "not
  // planned", and the distinction is what makes the rail complete up front.
  const withPlaceholders: DisplayMeal[] = [...meals];
  if (plannedDates) {
    const present = new Set(meals.map((m) => m.date));
    for (const date of plannedDates) {
      if (present.has(date)) continue;
      withPlaceholders.push({
        date,
        dayName: "",
        relative: null,
        timeframe: "upcoming",
        slotType: "recipe",
        mealType: "dinner",
        title: null,
        description: null,
        rationale: null,
        ingredientPreview: [],
        tags: [],
        estTimeMinutes: null,
        estCostCents: null,
        servings: null,
        chips: [],
        feedback: null,
        recipeId: null,
        recipeStatus: "none",
        pickedRecipeId: null,
        pickedSourceServings: null,
      });
    }
  }

  const elapsedMs = useElapsedMs();
  const { written, total } = writtenCount(withPlaceholders);
  // Only while there is genuinely nothing to report. Once a count exists the
  // count IS the reassurance, and two readouts would be competing for one slot.
  const waiting = total === 0 ? waitingMessage(elapsedMs) : null;

  return (
    <div className={SLOT_PADDING_BARE}>
      <ChefHeader
        status={total > 0 ? `Writing · ${written} of ${total}` : "Writing"}
        summary={chefSummary ?? null}
        rationale={chefNote}
        thinking
      />
      <PlanRail
        meals={withPlaceholders}
        weekStart={weekStart}
        showRationale
      />
      {total > 0 ? (
        <CountSlot written={written} total={total} />
      ) : waiting ? (
        <WaitingSlot message={waiting} />
      ) : null}
    </div>
  );
}

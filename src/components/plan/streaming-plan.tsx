"use client";

import type { DisplayMeal } from "./plan-helpers";
import { writtenCount } from "./rail-helpers";
import { ChefHeader } from "./rail/chef-header";
import { PlanRail } from "./rail/plan-rail";
import { CountSlot } from "./rail/floating-slot";

export interface StreamingPlanProps {
  chefSummary?: string;
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
        servings: null,
        chips: [],
        feedback: null,
        recipeId: null,
        recipeStatus: "none",
      });
    }
  }

  const { written, total } = writtenCount(withPlaceholders);

  return (
    <>
      <ChefHeader
        status={total > 0 ? `Writing · ${written} of ${total}` : "Writing"}
        summary={chefSummary ?? null}
        thinking
      />
      <PlanRail
        meals={withPlaceholders}
        weekStart={weekStart}
        showRationale
      />
      {total > 0 ? <CountSlot written={written} total={total} /> : null}
    </>
  );
}

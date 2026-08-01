"use client";

import { type DisplayMeal, type HydrationView } from "./plan-helpers";
import type { PlanDay } from "./rail-helpers";
import { PastMealRow } from "./past-meal-row";
import { ChefHeader } from "./rail/chef-header";
import { PlanRail } from "./rail/plan-rail";
import {
  ToastSlot,
  SLOT_PADDING_BARE,
  type SlotToast,
} from "./rail/floating-slot";

export interface PlanMidweekProps {
  meals: DisplayMeal[];
  weekStart: string;
  isConfirmed: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onTalkToChef: () => void;
  onTapMeal: (meal: DisplayMeal) => void;
  onTapDay: (day: PlanDay) => void;
  onDecide: (meal: DisplayMeal) => void;
  onAddDays: () => void;
  onAddNight: (date: string) => void;
  onFeedback: (meal: DisplayMeal, feedback: "thumbs_up" | "thumbs_down") => void;
  onStartOver: () => void;
  workingMealIds: ReadonlySet<string>;
  landedMealIds: ReadonlySet<string>;
  hydrationByDate: Record<string, HydrationView>;
  /** Mid-week has no primary to replace, but the chef still gets the slot. */
  toast?: SlotToast | null;
}

/**
 * The Wednesday-evening view — the best proof of "dynamically assembled, not
 * templated".
 *
 * Mid-week is a CONFIRMED week partway through, so it inherits the confirmed
 * screen's rules (§D): no floating action, the chef in the past tense, cards
 * carrying meta rather than placement arguments. What it adds is the past —
 * days already cooked, which collapse to feedback rows because the only thing
 * left to say about them is whether they were any good.
 */
export function PlanMidweek({
  meals,
  weekStart,
  onTalkToChef,
  onTapMeal,
  onTapDay,
  onDecide,
  onAddDays,
  onAddNight,
  onFeedback,
  onStartOver,
  workingMealIds,
  landedMealIds,
  toast,
}: PlanMidweekProps) {
  const past = meals.filter((m) => m.timeframe === "past");
  const ahead = meals.filter((m) => m.timeframe !== "past");

  return (
    <div className={SLOT_PADDING_BARE}>
      <ChefHeader
        status="Set"
        summary="Here's the rest of your week."
        onRevise={onTalkToChef}
        reviseLabel="Something's off"
      />

      <PlanRail
        meals={ahead}
        weekStart={weekStart}
        // Tonight and the days ahead keep their arguments: unlike a settled
        // week you have already read, these are decisions still in front of you.
        showRationale
        showAddControls
        workingMealIds={workingMealIds}
        landedMealIds={landedMealIds}
        onOpenMeal={onTapMeal}
        onOpenDay={onTapDay}
        onDecide={onDecide}
        onAddDays={onAddDays}
        onAddNight={onAddNight}
      />

      {past.length > 0 && (
        <section className="mt-7">
          <p className="m-0 mb-2.5 spec-eyebrow">
            EARLIER THIS WEEK
          </p>
          <div className="flex flex-col gap-2">
            {past.map((meal, i) => (
              <PastMealRow
                key={meal.id ?? i}
                meal={meal}
                onFeedback={(f) => onFeedback(meal, f)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <span className="text-[13.5px] text-[var(--spec-text-caption)]">
          Starting fresh?{" "}
        </span>
        <button
          type="button"
          onClick={onStartOver}
          className="text-[13.5px] text-[var(--spec-text-muted)] underline-offset-2 transition-colors hover:text-[var(--spec-text-primary)]"
        >
          Plan a new week →
        </button>
      </div>

      {toast ? <ToastSlot {...toast} /> : null}
    </div>
  );
}

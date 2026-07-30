"use client";

import { PastMealRow } from "./past-meal-row";
import { type DisplayMeal, isCookable } from "./plan-helpers";
import { ChefHeader } from "./rail/chef-header";
import {
  PrimarySlot,
  SLOT_PADDING_DRAFT,
  ToastSlot,
  type SlotToast,
} from "./rail/floating-slot";

export interface WeekWrappedStateProps {
  meals: DisplayMeal[];
  isConfirmed: boolean;
  onStartOver: () => void;
  onFeedback: (meal: DisplayMeal, feedback: "thumbs_up" | "thumbs_down") => void;
  toast?: SlotToast | null;
}

/**
 * The loop closing: every day in the plan has elapsed.
 *
 * WEEK-WRAPPED STAYS CALM (ledger §D). No confetti, no "Nice job!" — the week
 * happened, and the only interesting question is whether you'd cook any of it
 * again. So the chef speaks in the past tense, the recap is a quiet list, and
 * the one decision sits in the floating slot like every other decision on this
 * surface. It is NOT the confirmed screen's empty bottom edge: a wrapped week
 * has something left to ask.
 *
 * The `Rate them` door in the mid-week drawing is deliberately absent — its
 * destination (the rate-the-week screen) is re-tagged 1F, and a door with
 * nowhere to go is worse than the in-place thumbs that already work.
 */
export function WeekWrappedState({
  meals,
  isConfirmed,
  onStartOver,
  onFeedback,
  toast,
}: WeekWrappedStateProps) {
  const cooked = meals.filter((m) => isCookable(m.slotType));

  return (
    <div className={SLOT_PADDING_DRAFT}>
      <ChefHeader
        status="Wrapped"
        summary={
          isConfirmed ? "That's a wrap on this week." : "This plan's gone stale."
        }
        rationale={
          isConfirmed
            ? `You cooked ${cooked.length} ${cooked.length === 1 ? "dinner" : "dinners"}. How'd they land?`
            : "Those days have passed. Let's start a fresh week."
        }
      />

      {isConfirmed && cooked.length > 0 && (
        <section>
          <p className="m-0 mb-2.5 text-[10px] font-semibold tracking-[1.5px] text-[var(--spec-text-caption)]">
            HOW&apos;D IT GO
          </p>
          <div className="flex flex-col gap-2">
            {cooked.map((meal, i) => (
              <PastMealRow
                key={meal.id ?? i}
                meal={meal}
                onFeedback={(f) => onFeedback(meal, f)}
              />
            ))}
          </div>
          <p className="m-0 mt-2.5 text-[12.5px] text-[var(--spec-text-caption)]">
            Tap what you&apos;d cook again. I learn from it.
          </p>
        </section>
      )}

      {toast ? (
        <ToastSlot {...toast} />
      ) : (
        <PrimarySlot
          label="Plan next week"
          consequence="You'll pick what you're in the mood for."
          onClick={onStartOver}
        />
      )}
    </div>
  );
}

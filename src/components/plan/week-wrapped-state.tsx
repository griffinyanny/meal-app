"use client";

import { Button } from "@/components/ui/button";
import { PastMealRow } from "./past-meal-row";
import { type DisplayMeal, isCookable } from "./plan-helpers";

export interface WeekWrappedStateProps {
  meals: DisplayMeal[];
  isConfirmed: boolean;
  onStartOver: () => void;
  onFeedback: (meal: DisplayMeal, feedback: "thumbs_up" | "thumbs_down") => void;
}

// The loop closing: every day in the plan has elapsed. Instead of the
// nonsensical mid-week view (everything under "earlier this week"), the chef
// checks in on how the week went and invites the next one. A ritual moment,
// not an empty/error state.
export function WeekWrappedState({
  meals,
  isConfirmed,
  onStartOver,
  onFeedback,
}: WeekWrappedStateProps) {
  const cooked = meals.filter((m) => isCookable(m.slotType));

  return (
    <div className="space-y-6 pb-4">
      <div className="glass-surface space-y-3 rounded-2xl p-5">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          YOUR CHEF
        </p>
        <h2 className="text-xl font-bold leading-snug">
          {isConfirmed ? "That's a wrap on this week." : "This plan's gone stale."}
        </h2>
        <p className="text-[13px] leading-snug text-primary/90">
          {isConfirmed
            ? `You cooked ${cooked.length} ${cooked.length === 1 ? "dinner" : "dinners"}. How'd they land?`
            : "Those days have passed. Let's start a fresh week."}
        </p>
      </div>

      {isConfirmed && cooked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
            HOW&apos;D IT GO
          </p>
          <div className="space-y-2">
            {cooked.map((meal, i) => (
              <PastMealRow
                key={meal.id ?? i}
                meal={meal}
                onFeedback={(f) => onFeedback(meal, f)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tap what you&apos;d cook again. I learn from it.
          </p>
        </div>
      )}

      <Button onClick={onStartOver} className="w-full">
        Plan next week →
      </Button>
    </div>
  );
}

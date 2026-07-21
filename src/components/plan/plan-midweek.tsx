"use client";

import { Button } from "@/components/ui/button";
import { BottomBar } from "./bottom-bar";
import { MealCard } from "./meal-card";
import { PastMealRow } from "./past-meal-row";
import { type DisplayMeal, type HydrationView, isCookable } from "./plan-helpers";

export interface PlanMidweekProps {
  meals: DisplayMeal[];
  isConfirmed: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onTalkToChef: () => void;
  onTapMeal: (meal: DisplayMeal) => void;
  onChipClick: (meal: DisplayMeal, chip: string) => void;
  onFeedback: (meal: DisplayMeal, feedback: "thumbs_up" | "thumbs_down") => void;
  onStartOver: () => void;
  pendingDate: string | null;
  pendingLabel: string;
  changedDates: string[];
  hydrationByDate: Record<string, HydrationView>;
}

export function PlanMidweek({
  meals,
  isConfirmed,
  isConfirming,
  onConfirm,
  onTalkToChef,
  onTapMeal,
  onChipClick,
  onFeedback,
  onStartOver,
  pendingDate,
  pendingLabel,
  changedDates,
  hydrationByDate,
}: PlanMidweekProps) {
  const tonight = meals.find((m) => m.timeframe === "tonight");
  const past = meals.filter((m) => m.timeframe === "past");
  const upcoming = meals.filter((m) => m.timeframe === "upcoming");

  const cardAffordance = (meal: DisplayMeal) => ({
    working: pendingDate !== null && pendingDate === meal.date,
    workingLabel: pendingLabel,
    justChanged: !!meal.date && changedDates.includes(meal.date),
    hydration: meal.date ? hydrationByDate[meal.date] : undefined,
  });

  return (
    <div className="space-y-6 pb-4">
      {tonight && isCookable(tonight.slotType) && (
        <div className="space-y-2">
          <div className="rounded-2xl ring-1 ring-primary/30">
            <MealCard
              meal={tonight}
              onTap={() => onTapMeal(tonight)}
              onChipClick={(chip) => onChipClick(tonight, chip)}
              {...cardAffordance(tonight)}
            />
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
            EARLIER THIS WEEK
          </p>
          <div className="space-y-2">
            {past.map((meal, i) => (
              <PastMealRow
                key={meal.id ?? i}
                meal={meal}
                onFeedback={(f) => onFeedback(meal, f)}
              />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
            COMING UP
          </p>
          {upcoming.map((meal, i) => (
            <MealCard
              key={meal.id ?? meal.date ?? i}
              meal={meal}
              onTap={() => onTapMeal(meal)}
              onChipClick={(chip) => onChipClick(meal, chip)}
              {...cardAffordance(meal)}
            />
          ))}
        </div>
      )}

      <div className="space-y-1">
        <button
          type="button"
          onClick={onTalkToChef}
          className="block text-sm text-primary/90 transition-colors hover:text-primary"
        >
          Anything to adjust for the rest of the week? Talk to the Chef →
        </button>
        {/* Regenerate entry point — more muted than the tweak action above,
            since starting fresh replaces the confirmed week. */}
        <div>
          <span className="text-sm text-muted-foreground">Starting fresh? </span>
          <button
            type="button"
            onClick={onStartOver}
            className="text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground"
          >
            Plan a new week →
          </button>
        </div>
      </div>

      {!isConfirmed && (
        <BottomBar>
          <div className="glass-sheet flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {upcoming.length} {upcoming.length === 1 ? "meal" : "meals"} ahead
            </span>
            <Button size="sm" onClick={onConfirm} disabled={isConfirming}>
              {isConfirming ? "Saving…" : "Looks good →"}
            </Button>
          </div>
        </BottomBar>
      )}
    </div>
  );
}

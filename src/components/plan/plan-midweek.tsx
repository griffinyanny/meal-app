"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MealCard } from "./meal-card";
import { type DisplayMeal, isCookable } from "./plan-helpers";

export interface PlanMidweekProps {
  meals: DisplayMeal[];
  isConfirmed: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onTalkToChef: () => void;
  onTapMeal: (meal: DisplayMeal) => void;
  onChipClick: (meal: DisplayMeal, chip: string) => void;
  onFeedback: (meal: DisplayMeal, feedback: "thumbs_up" | "thumbs_down") => void;
}

function PastMealRow({
  meal,
  onFeedback,
}: {
  meal: DisplayMeal;
  onFeedback: (f: "thumbs_up" | "thumbs_down") => void;
}) {
  if (!isCookable(meal.slotType)) return null;
  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3 opacity-80">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-widest text-muted-foreground">
          {meal.dayName}
        </p>
        <p className="truncate text-sm">{meal.title}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onFeedback("thumbs_up")}
          aria-label="Liked it"
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-white/10",
            meal.feedback === "thumbs_up" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <ThumbsUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onFeedback("thumbs_down")}
          aria-label="Didn't like it"
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-white/10",
            meal.feedback === "thumbs_down"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <ThumbsDown className="size-4" />
        </button>
      </div>
    </div>
  );
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
}: PlanMidweekProps) {
  const tonight = meals.find((m) => m.timeframe === "tonight");
  const past = meals.filter((m) => m.timeframe === "past");
  const upcoming = meals.filter((m) => m.timeframe === "upcoming");

  return (
    <div className="space-y-6 pb-4">
      {tonight && isCookable(tonight.slotType) && (
        <div className="space-y-2">
          <div className="rounded-2xl ring-1 ring-primary/30">
            <MealCard
              meal={tonight}
              onTap={() => onTapMeal(tonight)}
              onChipClick={(chip) => onChipClick(tonight, chip)}
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
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onTalkToChef}
        className="text-sm text-primary/90 transition-colors hover:text-primary"
      >
        Anything to adjust for the rest of the week? Talk to the Chef →
      </button>

      {!isConfirmed && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-[430px] px-4">
          <div className="glass-sheet flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {upcoming.length} {upcoming.length === 1 ? "meal" : "meals"} ahead
            </span>
            <Button size="sm" onClick={onConfirm} disabled={isConfirming}>
              {isConfirming ? "Saving…" : "Looks good →"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

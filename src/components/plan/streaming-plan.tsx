"use client";

import { MealCard } from "./meal-card";
import type { DisplayMeal } from "./plan-helpers";

export interface StreamingPlanProps {
  chefSummary?: string;
  meals: DisplayMeal[];
}

export function StreamingPlan({ chefSummary, meals }: StreamingPlanProps) {
  return (
    <div className="space-y-4">
      <div className="glass-surface space-y-2 rounded-[22px] p-5">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          YOUR CHEF
        </p>
        <h2 className="text-xl font-bold leading-snug">
          {chefSummary ?? (
            <span className="inline-block h-5 w-3/4 animate-pulse rounded-[7px] bg-[rgba(240,222,190,0.1)]" />
          )}
        </h2>
        <p className="text-xs text-muted-foreground">Planning your week…</p>
      </div>

      <div className="space-y-3">
        {meals.length === 0
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className="glass-card h-28 animate-pulse opacity-40"
              />
            ))
          : meals.map((m, i) => (
              <MealCard key={m.date ?? i} meal={m} streaming />
            ))}
      </div>
    </div>
  );
}

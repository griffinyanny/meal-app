"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomBar } from "./bottom-bar";
import { MealCard } from "./meal-card";
import { type DisplayMeal, type HydrationView, isCookable } from "./plan-helpers";

export interface PlanReviewProps {
  chefSummary: string | null;
  meals: DisplayMeal[];
  isConfirmed: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onTalkToChef: () => void;
  onTapMeal: (meal: DisplayMeal) => void;
  onChipClick: (meal: DisplayMeal, chip: string) => void;
  onStartOver: () => void;
  // AI-mutation affordance threaded to each card: which day is mid-modify, its
  // chef-voice label, and which days just changed (one-shot highlight).
  pendingDate: string | null;
  pendingLabel: string;
  changedDates: string[];
  // Background recipe hydration, keyed by slot date.
  hydrationByDate: Record<string, HydrationView>;
}

function planStats(meals: DisplayMeal[]): string {
  const dinners = meals.filter((m) => isCookable(m.slotType)).length;
  const ingredients = new Set<string>();
  for (const m of meals) {
    for (const ing of m.ingredientPreview) ingredients.add(ing.toLowerCase());
  }
  const parts = [`${dinners} ${dinners === 1 ? "dinner" : "dinners"}`];
  if (ingredients.size > 0) parts.push(`~${ingredients.size} ingredients to buy`);
  return parts.join(" · ");
}

export function PlanReview({
  chefSummary,
  meals,
  isConfirmed,
  isConfirming,
  onConfirm,
  onTalkToChef,
  onTapMeal,
  onChipClick,
  onStartOver,
  pendingDate,
  pendingLabel,
  changedDates,
  hydrationByDate,
}: PlanReviewProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  // Sticky confirm bar appears once the hero's "Looks good" scrolls away.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showStickyBar = !heroVisible && !isConfirmed;

  return (
    <div className="space-y-4 pb-4">
      <div ref={heroRef} className="glass-surface space-y-3 rounded-2xl p-5">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          YOUR CHEF
        </p>
        <h2 className="text-xl font-bold leading-snug">
          Your week, ready to review
        </h2>
        {chefSummary && (
          <p className="text-[13px] leading-snug text-primary/90">
            {chefSummary}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{planStats(meals)}</p>

        {isConfirmed ? (
          <p className="pt-1 text-sm font-medium text-primary">
            Plan confirmed ✓
          </p>
        ) : (
          <div className="flex items-center gap-4 pt-1">
            <Button onClick={onConfirm} disabled={isConfirming} className="flex-1">
              {isConfirming ? "Saving…" : "Looks good →"}
            </Button>
            <button
              type="button"
              onClick={onTalkToChef}
              className="text-sm text-primary/90 transition-colors hover:text-primary"
            >
              Talk to the Chef
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {meals.map((meal, i) => (
          <MealCard
            key={meal.id ?? meal.date ?? i}
            meal={meal}
            onTap={() => onTapMeal(meal)}
            onChipClick={(chip) => onChipClick(meal, chip)}
            working={pendingDate !== null && pendingDate === meal.date}
            workingLabel={pendingLabel}
            justChanged={!!meal.date && changedDates.includes(meal.date)}
            hydration={meal.date ? hydrationByDate[meal.date] : undefined}
          />
        ))}
      </div>

      {/* Regenerate entry point — muted, end-of-list, so it can't be mistaken
          for the primary "Looks good →" confirm. Routes to the intent screen
          (non-destructive until generate actually fires there). */}
      <div className="pt-1">
        <span className="text-sm text-muted-foreground">
          {isConfirmed ? "Starting fresh? " : "Not feeling this week? "}
        </span>
        <button
          type="button"
          onClick={onStartOver}
          className="text-sm text-primary/90 transition-colors hover:text-primary"
        >
          {isConfirmed ? "Plan a new week →" : "Start over →"}
        </button>
      </div>

      {showStickyBar && (
        <BottomBar>
          <div
            data-testid="sticky-confirm-bar"
            className="glass-sheet flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <span className="text-sm text-muted-foreground">
              {planStats(meals)}
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

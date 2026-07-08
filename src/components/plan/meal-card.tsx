"use client";

import { cn } from "@/lib/utils";
import { type DisplayMeal, metaLine, isCookable } from "./plan-helpers";

export interface MealCardProps {
  meal: DisplayMeal;
  onTap?: () => void;
  onChipClick?: (chip: string) => void;
  streaming?: boolean;
  compact?: boolean;
}

export function MealCard({
  meal,
  onTap,
  onChipClick,
  streaming,
  compact,
}: MealCardProps) {
  // Eating out / skip → minimal, de-emphasized card. Not tappable.
  if (!isCookable(meal.slotType)) {
    return (
      <div className="glass-card p-4 opacity-50">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          {meal.dayName}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {meal.slotType === "eating_out" ? "Eating out" : "No meal planned"}
        </p>
      </div>
    );
  }

  const meta = metaLine(meal);
  const tappable = !streaming && !!onTap;

  // Whole-card tap target without nesting interactive elements: a real <button>
  // fills the card behind the content. The content is pointer-events-none so
  // taps fall through to it, while chips re-enable pointer events and sit above,
  // keeping their own action. Button and chips are siblings — no role=button
  // wrapping other buttons — so keyboard activation stays unambiguous.
  return (
    <div className={cn("glass-card relative p-4", streaming && "animate-pulse")}>
      {tappable && (
        <button
          type="button"
          onClick={onTap}
          aria-label={
            meal.title
              ? `Open ${meal.dayName}'s ${meal.title}`
              : `Open ${meal.dayName}'s meal`
          }
          className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      )}

      <div className={cn("relative z-10", tappable && "pointer-events-none")}>
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          {meal.dayName}
          {meal.relative ? ` · ${meal.relative}` : ""}
        </p>
        <h3 className="mt-1 text-[17px] font-semibold leading-snug">
          {meal.title ?? (
            <span className="text-muted-foreground/40">Thinking…</span>
          )}
        </h3>
        {meal.rationale && (
          <p className="mt-1.5 text-[13px] leading-snug text-primary/90">
            {meal.rationale}
            <span aria-hidden className="ml-0.5 text-primary/60">
              →
            </span>
          </p>
        )}
        {meta && <p className="mt-2 text-xs text-muted-foreground">{meta}</p>}

        {!compact && meal.chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {meal.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick?.(chip)}
                disabled={!onChipClick}
                className="pointer-events-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/90 transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:cursor-default disabled:opacity-60"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

export type RecipeFilter = "all" | "fav" | "cooked";

export type RecipeFiltersProps = {
  active: RecipeFilter;
  counts: Record<RecipeFilter, number>;
  onChange: (filter: RecipeFilter) => void;
};

const DEFS: { key: RecipeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fav", label: "Favorites" },
  { key: "cooked", label: "Cooked" },
];

/**
 * The library's filter chips: All · Favorites · Cooked, each with a count.
 *
 * THESE ARE CHIPS, AND §08 DRAWS THE CHIP (S55, found while taking the S48
 * critic's `+`-weight finding). The selected chip was `bg-primary` — a fully
 * filled cream button — so the Recipes library carried TWO objects at the
 * primary rung, and softening the `+` alone would simply have handed the rung
 * to a filter state. §08's rule is the whole point: *one filled cream button
 * per viewport, and if two actions both feel primary, one of them is not.*
 *
 * The spec's chip is cream-TINTED, never filled: on = .14 fill / .36 line /
 * 600, off = .05 / .12 / 500, at 36px · 13.5px · r12 with a 9px gap. Selection
 * takes the action cream (244,235,220) and the resting state the neutral cream
 * (240,222,190) — deliberate, per §08: "Selection is cream, never gold —
 * filtering is the user's act, not the chef's."
 */
export function RecipeFilters({ active, counts, onChange }: RecipeFiltersProps) {
  return (
    <div role="tablist" aria-label="Filter recipes" className="flex gap-[9px]">
      {DEFS.map(({ key, label }) => {
        const selected = key === active;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={selected}
            data-testid={`recipe-filter-${key}`}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 px-[15px] rounded-[12px] text-[13.5px] transition-colors cursor-pointer border",
              selected
                ? "bg-[rgba(244,235,220,0.14)] border-[rgba(244,235,220,0.36)] text-[var(--spec-action)] font-semibold"
                : "bg-[rgba(240,222,190,0.05)] text-[var(--spec-text-body)] border-[rgba(240,222,190,0.12)] font-medium hover:bg-[rgba(240,222,190,0.1)]"
            )}
          >
            {label}
            {/* "Counts inherit the chip's own colour at reduced weight" (§08). */}
            <span
              className={cn(
                "text-[12px] font-semibold",
                selected
                  ? "text-[rgba(244,235,220,0.6)]"
                  : "text-[var(--spec-text-caption)]"
              )}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

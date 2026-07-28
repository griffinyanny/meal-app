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

// The library's segmented control: All · Favorites · Cooked, each with a count.
export function RecipeFilters({ active, counts, onChange }: RecipeFiltersProps) {
  return (
    <div role="tablist" aria-label="Filter recipes" className="flex gap-2">
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
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[13px] font-semibold transition-colors cursor-pointer border",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-[rgba(240,222,190,0.05)] text-[var(--spec-text-body)] border-[rgba(240,222,190,0.1)] hover:bg-[rgba(240,222,190,0.1)]"
            )}
          >
            {label}
            <span className={cn("font-semibold", selected ? "opacity-85" : "opacity-60")}>
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

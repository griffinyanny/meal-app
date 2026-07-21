"use client";

import { cn } from "@/lib/utils";

export type OrganizeMode = "grouped" | "manual";

interface OrganizeToggleProps {
  mode: OrganizeMode;
  onChange: (mode: OrganizeMode) => void;
}

// Grouped (aisle sections, reorderable) ↔ Ungrouped (one flat, hand-ordered
// "notepad" list). A small segmented control; the active segment carries the
// primary fill.
export function OrganizeToggle({ mode, onChange }: OrganizeToggleProps) {
  return (
    <div
      className="glass-surface inline-flex gap-1 rounded-[11px] p-[3px]"
      role="tablist"
      aria-label="Organize the list"
    >
      {(["grouped", "manual"] as const).map((value) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            className={cn(
              "rounded-[9px] px-4 py-2 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value === "grouped" ? "Grouped" : "Ungrouped"}
          </button>
        );
      })}
    </div>
  );
}

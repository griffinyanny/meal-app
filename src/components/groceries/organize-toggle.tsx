"use client";

import { cn } from "@/lib/utils";

export type OrganizeMode = "grouped" | "manual";

interface OrganizeToggleProps {
  mode: OrganizeMode;
  onChange: (mode: OrganizeMode) => void;
}

// Grouped (aisle sections, reorderable) ↔ Ungrouped (one flat, hand-ordered
// "notepad" list).
//
// ⚠️ The selected segment LIFTS, it does not fill. The spec's §11 gallery draws
// this component and states the rule in one sentence — "Segmented. Two or three
// options, mutually exclusive, no colour — the selected segment lifts instead"
// — and the build had it as `bg-primary`, a fully filled cream button standing
// in for a toggle state. That is S55's Recipes filter chip one surface over: it
// spent §08's "one filled cream button per viewport" on a view preference, and
// once the §09 control below it grows a cream send while you type, the screen
// carries two. Values are the spec's own (track .045/.08 at r16 with a 4px
// inset; selected rgba(84,70,56,.9) raised at r12; rest fully transparent).
export function OrganizeToggle({ mode, onChange }: OrganizeToggleProps) {
  return (
    <div
      className="inline-flex gap-1 rounded-[16px] border border-[rgba(240,222,190,0.08)] bg-[rgba(240,222,190,0.045)] p-1"
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
              "rounded-[12px] px-4 py-2 text-[13.5px] transition-colors",
              active
                ? "border border-[rgba(240,222,190,0.16)] bg-[rgba(84,70,56,0.9)] font-semibold text-[var(--spec-text-primary)]"
                : "border border-transparent font-medium text-[var(--spec-text-muted)] hover:text-foreground"
            )}
          >
            {value === "grouped" ? "Grouped" : "Ungrouped"}
          </button>
        );
      })}
    </div>
  );
}

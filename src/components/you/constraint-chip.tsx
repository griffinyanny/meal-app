"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConstraintChipProps {
  label: string;
  // A weight sub-label ("allergy") rendered smaller/dimmer after the label.
  subLabel?: string;
  variant?: "danger" | "neutral";
  onRemove: () => void;
}

// A removable constraint chip. `danger` is the red safety weighting used on the
// "I never cook with" card; `neutral` is the calm dislikes/cuisines chip. Removal
// is direct (the ×) — no conversation required (feature #2).
export function ConstraintChip({
  label,
  subLabel,
  variant = "neutral",
  onRemove,
}: ConstraintChipProps) {
  const danger = variant === "danger";
  const display = label.length > 0 ? label[0].toUpperCase() + label.slice(1) : label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[12px] border py-2 pl-3 pr-2 text-sm font-semibold",
        danger
          ? "border-[rgba(217,106,91,0.32)] bg-[rgba(217,106,91,0.14)] text-[#F0D8D3]"
          : "border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.06)] font-medium text-[var(--spec-text-primary)]"
      )}
    >
      {display}
      {subLabel && (
        <span
          className={cn(
            "spec-eyebrow",
            danger ? "text-[rgba(240,216,211,0.7)]" : "text-muted-foreground"
          )}
        >
          {subLabel}
        </span>
      )}
      {/* BUG-048, closed in 1F/B8a. It was parked as a chip redesign — 44px
          inside a 36px chip — and measuring it showed it is not one. This is
          S56's Groceries drag-handle trade: a real 44px target with an equal
          negative margin, so the box the layout sees is the 20px it always was
          and the chip stays 36px.

          It survives the wrap because the overflow lands in dead space: the
          three call sites wrap at gap-2, so the target overhangs 6px into an
          8px column gap and 4px into an 8px row gap, and a neighbouring chip's
          BODY is not interactive — there is no target-on-target overlap.

          The paint stays 20px on purpose. Growing the hover fill to 44px would
          make the target visible on the one platform that does not need it, so
          the fill sits on the inner span and reacts to the whole button. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${display}`}
        className="group/remove -m-3 -mr-[14px] flex size-11 items-center justify-center"
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-[7px] transition-colors group-hover/remove:bg-[rgba(240,222,190,0.1)]",
            danger ? "text-[var(--spec-destructive-text)]" : "text-muted-foreground"
          )}
        >
          <X className="size-3.5" strokeWidth={2.2} />
        </span>
      </button>
    </span>
  );
}

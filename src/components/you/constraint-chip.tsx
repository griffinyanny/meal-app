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
        "inline-flex items-center gap-1.5 rounded-[11px] border py-2 pl-3 pr-2 text-sm font-semibold",
        danger
          ? "border-[rgba(255,69,58,0.34)] bg-[rgba(255,69,58,0.14)] text-[#FFD9D6]"
          : "border-white/10 bg-white/[0.06] font-medium text-[#E5E5EA]"
      )}
    >
      {display}
      {subLabel && (
        <span
          className={cn(
            "text-[11px] font-semibold",
            danger ? "text-[rgba(255,217,214,0.7)]" : "text-muted-foreground"
          )}
        >
          {subLabel}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${display}`}
        className={cn(
          "-mr-0.5 flex size-5 items-center justify-center rounded-md transition-colors hover:bg-white/10",
          danger ? "text-[#FF9B94]" : "text-muted-foreground"
        )}
      >
        <X className="size-3.5" strokeWidth={2.2} />
      </button>
    </span>
  );
}

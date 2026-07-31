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
            "text-[11px] font-semibold",
            danger ? "text-[rgba(240,216,211,0.7)]" : "text-muted-foreground"
          )}
        >
          {subLabel}
        </span>
      )}
      {/* ⚠️ BUG-048 — this is 20×20 against spec §12 item 05's 44px floor, and
          it is the one violation SH2 is allowed to find. The attribute is the
          exemption: it lives at the call site rather than in the spec file, it
          names the row that owns it, and SH2 fails if an exempt control is
          NOT undersized — so closing the bug reds the suite until the
          attribute goes with it (S52: a fixed bug cannot leave a stale
          permission behind). It is exempt rather than fixed because the chip
          itself is 36px tall: a 44px target inside it is a chip redesign,
          which is Griffin's call and not a sweep's. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${display}`}
        data-hit-target-exempt="BUG-048"
        className={cn(
          "-mr-0.5 flex size-5 items-center justify-center rounded-[7px] transition-colors hover:bg-[rgba(240,222,190,0.1)]",
          danger ? "text-[var(--spec-destructive-text)]" : "text-muted-foreground"
        )}
      >
        <X className="size-3.5" strokeWidth={2.2} />
      </button>
    </span>
  );
}

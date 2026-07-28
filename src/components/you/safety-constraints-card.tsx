"use client";

import { AlertTriangle } from "lucide-react";
import { ConstraintChip } from "./constraint-chip";
import { ChipAdder } from "./chip-adder";
import { isAllergyRestriction, restrictionLabel } from "./constraint-utils";

export interface SafetyConstraintsCardProps {
  restrictions: string[];
  onRemove: (restriction: string) => void;
  onAdd: (name: string) => void;
}

// The safety-weighted "I never cook with" card. Restrictions are treated as
// safety-critical (a wrong one is a real-world harm); allergy-marked items carry an
// extra "allergy" sub-label. Removal + add are both direct (feature #2).
export function SafetyConstraintsCard({
  restrictions,
  onRemove,
  onAdd,
}: SafetyConstraintsCardProps) {
  return (
    <div
      data-testid="you-safety-card"
      className="rounded-[18px] border border-[rgba(217,106,91,0.28)] bg-[rgba(217,106,91,0.09)] px-4 py-[15px]"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" strokeWidth={2} />
        <span className="text-[0.8rem] font-bold tracking-[0.2px] text-[var(--spec-destructive-text)]">
          I never cook with
        </span>
        <span className="ml-auto text-[10.5px] font-semibold tracking-[0.6px] text-[rgba(227,155,146,0.75)]">
          SAFETY-CRITICAL
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {restrictions.map((r) => (
          <ConstraintChip
            key={r}
            variant="danger"
            label={restrictionLabel(r)}
            subLabel={isAllergyRestriction(r) ? "allergy" : undefined}
            onRemove={() => onRemove(r)}
          />
        ))}
        <ChipAdder
          variant="danger"
          onAdd={onAdd}
          label="Add something you never cook with"
          placeholder="e.g. shellfish"
        />
      </div>
    </div>
  );
}

"use client";

import { ConstraintChip } from "./constraint-chip";
import { ChipAdder } from "./chip-adder";
import { householdRoster } from "@/lib/household";
import type { DisplayPreferences } from "./build-narrative";

export type EditableField = "dietary" | "household" | "time";

export interface SoftConstraintsCardProps {
  prefs: DisplayPreferences;
  onAddDislike: (name: string) => void;
  onRemoveDislike: (name: string) => void;
  onAddCuisine: (name: string) => void;
  onRemoveCuisine: (name: string) => void;
  onEditField: (field: EditableField) => void;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

function Divider() {
  return <div className="h-px bg-[rgba(240,222,190,0.06)]" />;
}

// The calmer soft-constraints card: dislikes + cuisines (direct chip edit) plus a
// row of tappable typed fields (dietary / household / cook-times). The "Eating"
// field is here (not just in the prose) so every structured field is directly
// editable (feature #2).
export function SoftConstraintsCard({
  prefs,
  onAddDislike,
  onRemoveDislike,
  onAddCuisine,
  onRemoveCuisine,
  onEditField,
}: SoftConstraintsCardProps) {
  return (
    <div data-testid="you-soft-card" className="glass-card flex flex-col gap-3.5 rounded-[18px] p-4">
      <div>
        <p className="mb-2 spec-meta text-muted-foreground">You&apos;re not a fan of</p>
        <div className="flex flex-wrap gap-2">
          {prefs.dislikes.map((d) => (
            <ConstraintChip key={d} label={d} onRemove={() => onRemoveDislike(d)} />
          ))}
          <ChipAdder onAdd={onAddDislike} label="Add a dislike" placeholder="e.g. cilantro" />
        </div>
      </div>

      <Divider />

      <div>
        <p className="mb-2 spec-meta text-muted-foreground">You lean toward</p>
        <div className="flex flex-wrap gap-2">
          {prefs.cuisinePreferences.map((c) => (
            <ConstraintChip key={c} label={c} onRemove={() => onRemoveCuisine(c)} />
          ))}
          <ChipAdder onAdd={onAddCuisine} label="Add a cuisine" placeholder="e.g. Japanese" />
        </div>
      </div>

      <Divider />

      <div className="flex gap-3">
        <FieldButton
          label="Eating"
          value={capitalize(prefs.dietaryFramework)}
          onClick={() => onEditField("dietary")}
        />
        <FieldButton
          label="Cooking for"
          // BUG-012 · this printed "4 adults" for 2 adults + 2 children.
          // `householdSize` stopped meaning adults in S36 — it is a derived
          // SERVINGS count that folds in children and 12-24mo babies — but the
          // label never followed. On the one surface whose job is letting you
          // check the chef isn't wrong about you, that was the chef being wrong
          // about you.
          //
          // With no composition on file the roster is unknown, so the count is
          // named as what it actually is rather than dressed as a roster.
          value={
            prefs.householdComposition
              ? householdRoster(prefs.householdComposition)
              : `${prefs.householdSize} ${prefs.householdSize === 1 ? "serving" : "servings"}`
          }
          onClick={() => onEditField("household")}
        />
        <FieldButton
          label="Time I'll take"
          value={`${prefs.maxCookTimeWeeknight} / ${prefs.maxCookTimeWeekend} min`}
          onClick={() => onEditField("time")}
        />
      </div>
    </div>
  );
}

function FieldButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex-1 text-left">
      <p className="mb-0.5 spec-meta text-muted-foreground">{label}</p>
      <p className="spec-row-title text-foreground">{value}</p>
    </button>
  );
}

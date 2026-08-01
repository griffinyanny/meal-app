"use client";

import { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  deriveHouseholdSize,
  type HouseholdComposition,
} from "@/lib/household";
import { HouseholdComposer } from "@/components/shared/household-composer";
import type { DisplayPreferences } from "./build-narrative";
import type { EditableField } from "./soft-constraints-card";
import type { PreferencesPatch } from "./use-you-mutations";

// Mirrors dietaryFrameworkSchema (schema/memory.ts). Kept as a client-local list so
// this component doesn't pull the server schema (drizzle) into the client bundle.
const DIETARY_OPTIONS = [
  "omnivore", "vegetarian", "vegan", "pescatarian",
  "keto", "paleo", "mediterranean", "other",
] as const;

const TITLES: Record<EditableField, string> = {
  dietary: "How you eat",
  household: "Who I'm cooking for",
  time: "How long you'll cook",
};

export interface FieldEditSheetProps {
  field: EditableField | null;
  prefs: DisplayPreferences;
  onClose: () => void;
  onSave: (patch: PreferencesPatch) => void;
}

// Direct editors for the typed scalar fields (feature #2), in the app's bottom-sheet
// vocabulary. Edits locally, then Save persists + closes.
export function FieldEditSheet({ field, prefs, onClose, onSave }: FieldEditSheetProps) {
  const [dietary, setDietary] = useState(prefs.dietaryFramework);
  // BUG-011 · THE COMPOSITION IS WHAT GETS EDITED, NOT THE SERVINGS COUNT.
  //
  // This used to be a single "People" stepper writing a bare `householdSize`,
  // which is a number with no way back to the bands it came from: step 2 adults
  // + 2 children from 4 to 5 and nothing can say whether that is a third adult
  // or a third child. So the scalar and the composition drifted, and the chef
  // prompt ended up carrying both — "Default servings: 4" beside "Cooking for
  // 2 adults and 1 baby". Editing the composition and letting the server derive
  // the count leaves exactly one writer and one derivation.
  //
  // A null composition means the question was never answered; the stepper still
  // has to start somewhere, and the default is the client's starting state
  // rather than a stored fact (BUG-010).
  const [household, setHousehold] = useState<HouseholdComposition>(
    prefs.householdComposition ?? DEFAULT_HOUSEHOLD_COMPOSITION
  );
  const [weeknight, setWeeknight] = useState(prefs.maxCookTimeWeeknight);
  const [weekend, setWeekend] = useState(prefs.maxCookTimeWeekend);
  const [prevField, setPrevField] = useState(field);

  // Seed the local drafts from current prefs on each open (render-time reset).
  if (field !== prevField) {
    setPrevField(field);
    if (field) {
      setDietary(prefs.dietaryFramework);
      setHousehold(prefs.householdComposition ?? DEFAULT_HOUSEHOLD_COMPOSITION);
      setWeeknight(prefs.maxCookTimeWeeknight);
      setWeekend(prefs.maxCookTimeWeekend);
    }
  }

  function save(patch: PreferencesPatch) {
    onSave(patch);
    onClose();
  }

  return (
    <Drawer open={field !== null} onOpenChange={(o) => !o && onClose()} modal={false} noBodyStyles>
      <DrawerContent className="glass-sheet">
        <DrawerHeader className="text-left pr-12">
          <DrawerTitle className="spec-feature-line">{field ? TITLES[field] : ""}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Adjust this preference directly.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-8">
          {field === "dietary" && (
            <div className="flex flex-col gap-1.5">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => save({ dietaryFramework: opt })}
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border px-4 py-3 text-left text-[0.95rem] capitalize transition-colors",
                    opt === dietary
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.04)] text-foreground hover:bg-[rgba(240,222,190,0.07)]"
                  )}
                >
                  {opt}
                  {opt === dietary && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>
          )}

          {field === "household" && (
            <>
              <HouseholdComposer
                value={household}
                onChange={setHousehold}
                idPrefix="you"
              />
              {/* Said out loud because adding a 6-to-12-month-old deliberately
                  does NOT move the count — they eat adapted bites, not a
                  portion — and a number that refuses to change after a tap
                  reads as a control that didn't register. Same sentence the
                  interview closes its household turn with. */}
              <p className="m-0 text-center spec-meta text-[var(--spec-text-caption)]">
                I&apos;ll cook for {deriveHouseholdSize(household)}{" "}
                {deriveHouseholdSize(household) === 1 ? "serving" : "servings"}
                {household.babyStage === "6_to_12m"
                  ? ", plus bites for the little one."
                  : "."}
              </p>
              <Button
                className="w-full"
                onClick={() => save({ householdComposition: household })}
              >
                Save
              </Button>
            </>
          )}

          {field === "time" && (
            <>
              <Stepper
                label="Weeknight ceiling (min)"
                value={weeknight}
                min={10}
                max={180}
                step={5}
                onChange={setWeeknight}
              />
              <Stepper
                label="Weekend ceiling (min)"
                value={weekend}
                min={10}
                max={300}
                step={5}
                onChange={setWeekend}
              />
              <Button
                className="w-full"
                onClick={() =>
                  save({ maxCookTimeWeeknight: weeknight, maxCookTimeWeekend: weekend })
                }
              >
                Save
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.04)] px-4 py-3">
      <span className="spec-body text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex size-9 items-center justify-center rounded-full border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.06)] text-foreground disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-10 text-center text-[1.05rem] font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex size-9 items-center justify-center rounded-full border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.06)] text-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

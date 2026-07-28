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
  household: "How many you're cooking for",
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
  const [household, setHousehold] = useState(prefs.householdSize);
  const [weeknight, setWeeknight] = useState(prefs.maxCookTimeWeeknight);
  const [weekend, setWeekend] = useState(prefs.maxCookTimeWeekend);
  const [prevField, setPrevField] = useState(field);

  // Seed the local drafts from current prefs on each open (render-time reset).
  if (field !== prevField) {
    setPrevField(field);
    if (field) {
      setDietary(prefs.dietaryFramework);
      setHousehold(prefs.householdSize);
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
          <DrawerTitle className="text-lg">{field ? TITLES[field] : ""}</DrawerTitle>
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
              <Stepper
                label="People"
                value={household}
                min={1}
                max={20}
                step={1}
                onChange={setHousehold}
              />
              <Button className="w-full" onClick={() => save({ householdSize: household })}>
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
      <span className="text-[0.9rem] text-foreground">{label}</span>
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

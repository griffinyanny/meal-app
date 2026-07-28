"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { DisplayMeal, HydrationView } from "../plan-helpers";
import type { PlanDay } from "../rail-helpers";
import { MealSheetContent } from "./meal-sheet-content";
import { DaySheetContent } from "./day-sheet-content";

/** What the sheet is currently about. Exactly one thing, or nothing. */
export type PlanSheetTarget =
  | { kind: "meal"; meal: DisplayMeal }
  | { kind: "day"; day: PlanDay };

export interface PlanSheetProps {
  target: PlanSheetTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModify: (request: string) => void;
  onTalkToChef: () => void;
  onOpenMeal: (meal: DisplayMeal) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
  /** Background hydration for the meal on screen — drives the recipe row. */
  hydration?: HydrationView;
}

/**
 * ONE SHEET, TWO INVOCATIONS (ledger §D, `1l`: "the same shell, first line and
 * primary swapped").
 *
 * The shell is a single `Drawer`, not two that happen to look alike. That is
 * partly fidelity to the ledger and partly a hard-won lesson: coexisting vaul
 * drawers are exactly what produced the `pointer-events: none` lockup D3 exists
 * to guard against, and stacking a meal sheet on top of the day sheet it was
 * opened from would put two of them on screen at once for the length of an exit
 * animation. Swapping the target inside one drawer makes that unrepresentable.
 */
export function PlanSheet({
  target,
  open,
  onOpenChange,
  onModify,
  onTalkToChef,
  onOpenMeal,
  isModifying,
  workingLabel,
  modifyError,
  hydration,
}: PlanSheetProps) {
  // Always render the Drawer so vaul can transition closed→open cleanly on the
  // first tap. Content is conditional inside.
  // modal={false} + noBodyStyles avoid vaul's body manipulation (scroll lock and
  // pointer-events toggling), which conflicts when two drawers coexist in the
  // tree (this one + TalkToChefSheet) and was leaving the body with
  // `pointer-events: none` after close, killing subsequent card taps.
  return (
    <Drawer
      open={open && target !== null}
      onOpenChange={onOpenChange}
      modal={false}
      noBodyStyles
    >
      <DrawerContent className="glass-sheet">
        {target?.kind === "meal" ? (
          <MealSheetContent
            meal={target.meal}
            onModify={onModify}
            onTalkToChef={onTalkToChef}
            isModifying={isModifying}
            workingLabel={workingLabel}
            modifyError={modifyError}
            hydration={hydration}
          />
        ) : null}
        {target?.kind === "day" ? (
          <DaySheetContent
            day={target.day}
            onModify={onModify}
            onTalkToChef={onTalkToChef}
            onOpenMeal={onOpenMeal}
            isModifying={isModifying}
            workingLabel={workingLabel}
            modifyError={modifyError}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

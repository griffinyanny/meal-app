"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { MessageCircle } from "lucide-react";
import { type DisplayMeal, metaLine, scopedRequest } from "./plan-helpers";

export interface ExpandedMealSheetProps {
  meal: DisplayMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModify: (request: string) => void;
  onTalkToChef: (meal: DisplayMeal) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
}

export function ExpandedMealSheet({
  meal,
  open,
  onOpenChange,
  onModify,
  onTalkToChef,
  isModifying,
  workingLabel,
  modifyError,
}: ExpandedMealSheetProps) {
  // Always render the Drawer so vaul can transition closed→open cleanly on the
  // first tap. Content is conditional inside.
  // modal={false} + noBodyStyles avoid vaul's body manipulation (scroll lock
  // and pointer-events toggling), which conflicts when two drawers coexist in
  // the tree (this one + TalkToChefSheet) and was leaving the body with
  // `pointer-events: none` after close, killing subsequent card taps. Drag-to-
  // dismiss (default), the X, and click-outside (shared DrawerContent scrim)
  // all still close it.
  return (
    <Drawer
      open={open && meal !== null}
      onOpenChange={onOpenChange}
      modal={false}
      noBodyStyles
    >
      <DrawerContent className="glass-sheet">
        {meal && (
          <ExpandedMealContent
            meal={meal}
            onModify={onModify}
            onTalkToChef={onTalkToChef}
            isModifying={isModifying}
            workingLabel={workingLabel}
            modifyError={modifyError}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface ExpandedMealContentProps {
  meal: DisplayMeal;
  onModify: (request: string) => void;
  onTalkToChef: (meal: DisplayMeal) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
}

function ExpandedMealContent({
  meal,
  onModify,
  onTalkToChef,
  isModifying,
  workingLabel,
  modifyError,
}: ExpandedMealContentProps) {
  const meta = metaLine(meal);
  const label = [meal.dayName, meal.relative ?? "DINNER"]
    .filter(Boolean)
    .join(" · ");

  // AI-generated per-meal chips become modification actions, plus a standard
  // swap. Each routes a natural-language request through plan.modify.
  const actions = [
    ...meal.chips.map((chip) => ({
      label: chip,
      request: scopedRequest(chip, meal),
    })),
    {
      label: "Swap for something else",
      request: `Swap ${meal.dayName.toLowerCase()}'s ${meal.title ?? "dinner"} for something different.`,
    },
  ];

  return (
    <>
      <DrawerHeader className="text-left pr-12">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground">
          {label}
        </p>
        <DrawerTitle className="text-xl leading-snug">
          {meal.title ?? "Meal"}
        </DrawerTitle>
        {meal.rationale && (
          <DrawerDescription className="text-[13px] text-primary/90">
            {meal.rationale}
          </DrawerDescription>
        )}
      </DrawerHeader>

      <div className="space-y-5 px-4 pb-8">
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}

        {meal.ingredientPreview.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {meal.ingredientPreview.map((ing) => (
              <span
                key={ing}
                className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-foreground/80"
              >
                {ing}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What would you like to do?
          </p>
          <div className="grid gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onModify(action.request)}
                disabled={isModifying}
                className="glass-card rounded-xl px-4 py-3 text-left text-sm transition-all hover:bg-white/5 active:scale-[0.99] active:opacity-80 disabled:opacity-60"
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onTalkToChef(meal)}
              disabled={isModifying}
              className="flex items-center gap-2 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <MessageCircle className="size-4" />
              Something else? Tell your chef
            </button>
          </div>
        </div>

        {/* Pending stays IN the open sheet (the sheet closes on success, not on
            tap) so the action never feels like it did nothing. */}
        {isModifying ? (
          <div aria-live="polite">
            <p className="text-sm text-primary/90">
              {workingLabel ?? "Reworking your plan…"}
            </p>
            <div className="shimmer-bar mt-2 h-0.5 w-full rounded-full" />
          </div>
        ) : (
          modifyError && (
            <p className="text-sm text-destructive/90" role="alert">
              {modifyError}
            </p>
          )
        )}
      </div>
    </>
  );
}

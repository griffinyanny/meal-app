"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { MessageCircle, X } from "lucide-react";
import { type DisplayMeal, metaLine } from "./plan-helpers";

export interface ExpandedMealSheetProps {
  meal: DisplayMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModify: (request: string) => void;
  onTalkToChef: (meal: DisplayMeal) => void;
  isModifying: boolean;
}

export function ExpandedMealSheet({
  meal,
  open,
  onOpenChange,
  onModify,
  onTalkToChef,
  isModifying,
}: ExpandedMealSheetProps) {
  // Always render the Drawer so vaul can transition closed→open cleanly on the
  // first tap. Content is conditional inside.
  // modal={false} + noBodyStyles avoid vaul's body manipulation (scroll lock
  // and pointer-events toggling), which conflicts when two drawers coexist in
  // the tree (this one + TalkToChefSheet) and was leaving the body with
  // `pointer-events: none` after close, killing subsequent card taps. Drag-to-
  // dismiss still works via dismissible (the default).
  return (
    <Drawer
      open={open && meal !== null}
      onOpenChange={onOpenChange}
      modal={false}
      noBodyStyles
    >
      <DrawerContent className="glass-sheet">
        <DrawerClose
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </DrawerClose>
        {meal && (
          <ExpandedMealContent
            meal={meal}
            onModify={onModify}
            onTalkToChef={onTalkToChef}
            isModifying={isModifying}
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
}

function ExpandedMealContent({
  meal,
  onModify,
  onTalkToChef,
  isModifying,
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
      request: `${chip} — for ${meal.dayName.toLowerCase()}'s ${meal.title ?? "dinner"}.`,
    })),
    {
      label: "Swap for something else",
      request: `Swap ${meal.dayName.toLowerCase()}'s ${meal.title ?? "dinner"} for something different.`,
    },
  ];

  return (
    <>
      <DrawerHeader className="text-left">
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
                className="glass-card rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-60"
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

        {isModifying && (
          <p className="text-sm text-muted-foreground">Reworking your plan…</p>
        )}
      </div>
    </>
  );
}

"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { RecipeView } from "@/components/recipes/recipe-view";
import {
  type DisplayMeal,
  type HydrationView,
  isCookable,
  scopedRequest,
} from "./plan-helpers";
import { metaLine } from "./rail-helpers";

export interface ExpandedMealSheetProps {
  meal: DisplayMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModify: (request: string) => void;
  onTalkToChef: (meal: DisplayMeal) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
  // Background hydration view for this meal — drives the failed fallback.
  hydration?: HydrationView;
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
  hydration,
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
            hydration={hydration}
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
  hydration?: HydrationView;
}

function ExpandedMealContent({
  meal,
  onModify,
  onTalkToChef,
  isModifying,
  workingLabel,
  modifyError,
  hydration,
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

        <MealRecipeSection meal={meal} hydration={hydration} />

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
                className="glass-card rounded-xl px-4 py-3 text-left text-sm transition-all hover:bg-[rgba(240,222,190,0.05)] active:scale-[0.99] active:opacity-80 disabled:opacity-60"
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

function PreviewPills({ meal }: { meal: DisplayMeal }) {
  if (meal.ingredientPreview.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {meal.ingredientPreview.map((ing) => (
        <span
          key={ing}
          className="rounded-full border border-[rgba(240,222,190,0.08)] bg-[rgba(240,222,190,0.05)] px-2.5 py-1 text-xs text-foreground/80"
        >
          {ing}
        </span>
      ))}
    </div>
  );
}

// The recipe area of the sheet, hydration-aware: the full recipe once it's
// ready, a "writing" shimmer over the plan-preview pills while it generates, and
// a graceful fall back to the pills if hydration failed or the recipe is gone.
// This is the wife's during-review need — real recipe detail while she evaluates.
function MealRecipeSection({
  meal,
  hydration,
}: {
  meal: DisplayMeal;
  hydration?: HydrationView;
}) {
  const ready = meal.recipeStatus === "ready" && !!meal.recipeId;
  const recipeQuery = trpc.recipe.get.useQuery(
    { id: meal.recipeId ?? "" },
    { enabled: ready, staleTime: 5 * 60_000 }
  );

  if (!isCookable(meal.slotType)) return null;

  if (ready) {
    if (recipeQuery.data) return <RecipeView recipe={recipeQuery.data} />;
    if (recipeQuery.isError) {
      return (
        <div className="space-y-2">
          <PreviewPills meal={meal} />
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load the full recipe right now.
          </p>
        </div>
      );
    }
    // recipe is ready in the DB; the fetch is in flight.
    return (
      <div aria-live="polite">
        <PreviewPills meal={meal} />
        <div className="shimmer-bar mt-3 h-0.5 w-full rounded-full" />
      </div>
    );
  }

  // Not ready. Hydration failed → fall back to the preview honestly; otherwise
  // it's still being written.
  if (hydration === "failed") {
    return (
      <div className="space-y-2">
        <PreviewPills meal={meal} />
        <p className="text-xs text-muted-foreground">
          The full recipe didn&apos;t come together — here&apos;s the plan preview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <PreviewPills meal={meal} />
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span
          aria-hidden
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary/60"
        />
        Writing the full recipe…
      </div>
    </div>
  );
}

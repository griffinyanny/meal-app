"use client";

import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { type DisplayMeal, type HydrationView, isCookable } from "./plan-helpers";
import { ChefHeader } from "./rail/chef-header";
import { PlanRail } from "./rail/plan-rail";
import { PrimarySlot } from "./rail/floating-slot";
// W6 (cost estimation) is display-ready but has no data behind it yet: the
// `estCostCents` column and the generation output that fills it are the server
// half, still unbuilt. `estimateCents` arrives null until then, and every
// estimate surface renders nothing rather than a zero (cost-helpers, rule 3).
import { formatEstimate } from "./cost-helpers";

export interface PlanReviewProps {
  chefSummary: string | null;
  meals: DisplayMeal[];
  weekStart: string;
  isConfirmed: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onTalkToChef: () => void;
  onTapMeal: (meal: DisplayMeal) => void;
  onStartOver: () => void;
  /** Which rows the chef is rewriting, and which just changed. */
  workingMealIds: ReadonlySet<string>;
  landedMealIds: ReadonlySet<string>;
  hydrationByDate: Record<string, HydrationView>;
  /** Item count on the generated list — only exists once confirmed. */
  groceryItemCount?: number | null;
  estimateCents?: number | null;
}

function cookableCount(meals: DisplayMeal[]): number {
  return meals.filter((m) => isCookable(m.slotType) && !!m.title).length;
}

// "Confirm five dinners" / "Confirm 14 meals". The counter earns its keep: it
// states what the grocery list WILL and will not include, so an undecided slot
// can never be mistaken for something the shop covers.
function confirmLabel(meals: DisplayMeal[]): string {
  const n = cookableCount(meals);
  const dinnersOnly = meals.every((m) => m.mealType === "dinner");
  if (dinnersOnly) return `Confirm ${n} ${n === 1 ? "dinner" : "dinners"}`;
  return `Confirm ${n} ${n === 1 ? "meal" : "meals"}`;
}

/**
 * The week, draft or confirmed.
 *
 * DRAFT AND CONFIRMED ARE DIFFERENT SCREENS (ledger §D), and the differences
 * are structural rather than a badge:
 *
 *   - the floating action is GONE once confirmed — the decision was spent, and
 *     an empty bottom edge is the strongest signal that nothing is being asked
 *   - the grocery row takes the place the argument used to occupy, because the
 *     list is the thing that came into existence
 *   - meta reads "Set", not "Draft"; the chef speaks in the past tense
 *   - the wash drops from ambient to flat: a settled week is not a decision
 *     surface
 *   - cards keep their meta but lose their placement arguments — the argument
 *     was for the draft; once you have agreed, the card's job is reference
 */
export function PlanReview({
  chefSummary,
  meals,
  weekStart,
  isConfirmed,
  isConfirming,
  onConfirm,
  onTalkToChef,
  onTapMeal,
  onStartOver,
  workingMealIds,
  landedMealIds,
  groceryItemCount,
  estimateCents,
}: PlanReviewProps) {
  const estimate = formatEstimate(estimateCents);

  return (
    <>
      <ChefHeader
        status={isConfirmed ? "Set" : "Draft"}
        summary={chefSummary}
        onRevise={isConfirmed ? onStartOver : onTalkToChef}
        reviseLabel={isConfirmed ? "Plan a new week" : "Something's off"}
      />

      {/* Confirmed only: the list is the first object after the chef speaks. */}
      {isConfirmed ? (
        <Link
          href="/groceries"
          className="mb-[22px] flex min-h-[56px] w-full items-center gap-[13px] rounded-[18px] border border-[rgba(240,222,190,0.08)] bg-[rgba(240,222,190,0.045)] px-[14px] py-[13px] text-left"
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[12px] border border-[rgba(244,235,220,0.32)] bg-[rgba(244,235,220,0.1)]">
            <ShoppingBag
              aria-hidden
              className="size-[17px] stroke-[var(--spec-action)]"
              strokeWidth={1.9}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-semibold leading-[1.25] text-[var(--spec-text-primary)]">
              {groceryItemCount != null
                ? `${groceryItemCount} things to buy`
                : "Your grocery list"}
            </span>
            {estimate ? (
              <span className="mt-0.5 block text-[12.5px] text-[var(--spec-text-caption)]">
                {estimate} estimated
              </span>
            ) : null}
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 stroke-[var(--spec-text-muted)]"
            strokeWidth={2.1}
          />
        </Link>
      ) : null}

      <PlanRail
        meals={meals}
        weekStart={weekStart}
        // A confirmed week's cards keep meta and lose their arguments.
        showRationale={!isConfirmed}
        // Adding a night is an edit to a real plan; on a draft it is just a
        // hole in something unfinished, so the control is not offered yet.
        showAddControls={isConfirmed}
        workingMealIds={workingMealIds}
        landedMealIds={landedMealIds}
        onOpenMeal={onTapMeal}
      />

      {isConfirmed ? null : (
        <PrimarySlot
          label={confirmLabel(meals)}
          consequence={
            estimate
              ? `Saying yes writes your grocery list · ${estimate}`
              : "Saying yes writes your grocery list."
          }
          onClick={onConfirm}
          inert={isConfirming || workingMealIds.size > 0}
        />
      )}
    </>
  );
}

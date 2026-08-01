"use client";

import { cn } from "@/lib/utils";
import type { DisplayMeal } from "../plan-helpers";
import { dayTitle } from "../plan-helpers";
import {
  groupIntoDays,
  isAbsentDay,
  unplannedSpan,
  type PlanDay,
} from "../rail-helpers";
import { AbsentDayRow, DayContainer } from "./day-container";

export interface PlanRailProps {
  meals: DisplayMeal[];
  weekStart: string;
  /** Draft rows argue for placement; a confirmed week keeps only the top one. */
  showRationale?: boolean;
  /** Only a real plan can be edited — a draft's gaps aren't holes yet (§D). */
  showAddControls?: boolean;
  workingMealIds?: ReadonlySet<string>;
  landedMealIds?: ReadonlySet<string>;
  onOpenMeal?: (meal: DisplayMeal) => void;
  /** Tapping a day's date opens the day sheet (§D, `1l`). */
  onOpenDay?: (day: PlanDay) => void;
  /** Adding a night to a day nobody planned — a different act, same rail. */
  onAddNight?: (date: string) => void;
  onDecide?: (meal: DisplayMeal) => void;
  onAddDays?: () => void;
}

// The sentence a slot with no answer yet shows in place of a title.
//
// It names the DEPENDENCY when there is one ("Friday, after Wednesday") because
// that is real information the scheduler already has, and it is more honest than
// three identical placeholders. `description` is where generation puts it.
function provisionalSentence(meal: DisplayMeal): string {
  if (meal.description) return meal.description;
  return `Working out ${dayTitle(meal.dayName)}`;
}

/**
 * The week, as days you chose.
 *
 * A WEEK IS THE DAYS YOU CHOSE, NEVER A CALENDAR WITH HOLES (§D). Unplanned
 * days are not rows — the rail renders what exists, and the absence is
 * acknowledged exactly once, at the bottom, beside the one control that
 * changes it. Four skeleton rows for days nobody asked about reads as a
 * rendering failure, which is the finding that produced this rule.
 */
export function PlanRail({
  meals,
  weekStart,
  showRationale = true,
  showAddControls = false,
  workingMealIds,
  landedMealIds,
  onOpenMeal,
  onOpenDay,
  onAddNight,
  onDecide,
  onAddDays,
}: PlanRailProps) {
  const days = groupIntoDays(meals);
  const missing = unplannedSpan(days, weekStart);

  return (
    <div className="flex flex-col gap-[9px]" data-testid="plan-rail">
      {days.map((day, i) => {
        const isLast = i === days.length - 1;
        if (isAbsentDay(day)) {
          const reason = day.meals[0]?.description ?? "You're out";
          return (
            <AbsentDayRow
              key={day.date}
              date={day.date}
              label={reason}
              action={
                showAddControls && onAddNight
                  ? { label: "Add a night", onClick: () => onAddNight(day.date) }
                  : undefined
              }
            />
          );
        }
        return (
          <DayContainer
            key={day.date}
            day={day}
            isLast={isLast}
            showRationale={showRationale}
            workingMealIds={workingMealIds}
            landedMealIds={landedMealIds}
            onOpenMeal={onOpenMeal}
            onOpenDay={onOpenDay}
            onDecide={onDecide}
            provisionalSentence={provisionalSentence}
          />
        );
      })}

      {/* 56px is the EMPTY-DAY rail row height and it is sized for a day. This
          is not a day — it is the week's closing line, and it only needs that
          height when it carries the control. A draft renders no control (§D:
          a draft's gaps aren't holes yet), so there the row is a caption and a
          hairline floating in button-sized space, which is most of the void
          Layer A flagged under the Start-over link (M2). */}
      {missing ? (
        <div
          className={cn(
            "flex items-center gap-[11px]",
            showAddControls && onAddDays ? "min-h-[56px]" : "min-h-[38px]"
          )}
        >
          {/* Empty rail gutter: the closing line is about the week, not a day. */}
          <div className="w-[38px] flex-none" />
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="spec-body text-[var(--spec-text-caption)]">
              {missing} not planned
            </span>
            <span className="h-px flex-1 bg-[rgba(240,222,190,0.09)]" />
            {showAddControls && onAddDays ? (
              <button
                type="button"
                onClick={onAddDays}
                className="spec-control-cream h-9 flex-none rounded-[12px] px-[13px] text-[13px] font-semibold text-[var(--spec-action)]"
              >
                Add days
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

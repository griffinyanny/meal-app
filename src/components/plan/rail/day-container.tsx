"use client";

import { cn } from "@/lib/utils";
import type { DisplayMeal } from "../plan-helpers";
import {
  carriesRationale,
  dayOfMonth,
  isProvisional,
  shortDayName,
  type PlanDay,
} from "../rail-helpers";
import { MealRowCompact, MealRowFeature, ProvisionalRow } from "./meal-row";

/** The 38px date column. A label, not a calendar — it never implies a grid. */
function DateColumn({
  date,
  muted,
  connector,
}: {
  date: string;
  muted?: boolean;
  connector: boolean;
}) {
  return (
    <div className="flex w-[38px] flex-none flex-col items-center pt-1">
      <span
        className={cn(
          "text-[10.5px] font-bold tracking-[1.3px]",
          muted
            ? "text-[var(--spec-text-caption)]"
            : "text-[var(--spec-text-muted)]"
        )}
      >
        {shortDayName(date).toUpperCase()}
      </span>
      <span
        className={cn(
          "text-[16px] font-semibold leading-[1.2]",
          muted
            ? "text-[var(--spec-text-muted)]"
            : "text-[var(--spec-text-primary)]"
        )}
      >
        {dayOfMonth(date)}
      </span>
      {connector ? (
        <span className="mt-1.5 w-px flex-1 bg-[rgba(240,222,190,0.12)]" />
      ) : null}
    </div>
  );
}

/**
 * A day with nothing to cook — you're out, or the night is simply unplanned.
 *
 * A CONTAINER NEEDS CONTENTS (§D): this is a 56px rail line with no surface at
 * all, not an empty card and never a dashed box. The hairline carries the eye
 * across to whatever control the state earns.
 */
export function AbsentDayRow({
  date,
  label,
  action,
}: {
  date: string;
  label: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-[56px] items-center gap-[11px]">
      <DateColumn date={date} muted connector={false} />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="text-[14px] text-[var(--spec-text-muted)]">{label}</span>
        <span className="h-px flex-1 bg-[rgba(240,222,190,0.09)]" />
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="spec-control-cream h-9 flex-none rounded-[12px] px-[13px] text-[13px] font-semibold text-[var(--spec-action)]"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface DayContainerProps {
  day: PlanDay;
  /** Last day in the rail — its connector line stops. */
  isLast: boolean;
  /** Draft rows argue for placement; a confirmed week keeps only the top one. */
  showRationale: boolean;
  workingMealIds?: ReadonlySet<string>;
  landedMealIds?: ReadonlySet<string>;
  onOpenMeal?: (meal: DisplayMeal) => void;
  onDecide?: (meal: DisplayMeal) => void;
  /** The sentence a provisional slot shows in place of a title. */
  provisionalSentence: (meal: DisplayMeal) => string;
}

/**
 * One day of the week.
 *
 * DAYS ARE CONTAINERS; MEALS ARE INSET ROWS (§D). With one meal the container
 * IS the card. With two or more it becomes an 8px shell holding 14px rows —
 * which is how fifteen meals fit the same scroll as five dinners, and why the
 * change ring sits on a row's 14px radius inside the day's 18px rather than on
 * the day itself.
 */
export function DayContainer({
  day,
  isLast,
  showRationale,
  workingMealIds,
  landedMealIds,
  onOpenMeal,
  onDecide,
  provisionalSentence,
}: DayContainerProps) {
  const solo = day.meals.length === 1;
  const density = solo ? "solo" : "nested";

  const rows = day.meals.map((meal) => {
    const key = meal.id ?? `${day.date}-${meal.mealType}`;
    if (isProvisional(meal)) {
      return (
        <ProvisionalRow
          key={key}
          meal={meal}
          density={density}
          sentence={provisionalSentence(meal)}
          onDecide={onDecide && carriesRationale(meal.mealType) ? onDecide : undefined}
        />
      );
    }
    const working = !!meal.id && !!workingMealIds?.has(meal.id);
    if (carriesRationale(meal.mealType)) {
      return (
        <MealRowFeature
          key={key}
          meal={meal}
          density={density}
          showRationale={showRationale}
          working={working}
          landed={!!meal.id && !!landedMealIds?.has(meal.id)}
          onOpen={onOpenMeal}
        />
      );
    }
    return (
      <MealRowCompact key={key} meal={meal} onOpen={onOpenMeal} working={working} />
    );
  });

  return (
    <div className="flex items-stretch gap-[11px]">
      <DateColumn date={day.date} connector={!isLast} />
      {solo ? (
        <div className="min-w-0 flex-1">{rows}</div>
      ) : (
        <div className="spec-glass flex min-w-0 flex-1 flex-col gap-1.5 rounded-[18px] p-2">
          {rows}
        </div>
      )}
    </div>
  );
}

"use client";

import { type DisplayMeal, dayTitle } from "../plan-helpers";
import { dayOfMonth, metaLine, shortDayName, type PlanDay } from "../rail-helpers";
import {
  SheetBody,
  SheetChip,
  SheetGroup,
  SheetIdentity,
  SheetRow,
  SheetStatus,
} from "./sheet-parts";

// Day-level asks. These change the DAY rather than a dish, which is the whole
// reason the day gets a sheet of its own — at one dinner a day the distinction
// is thin, and at three meals a day it is the only way to say "make Tuesday
// easier" without naming a dish.
function dayChips(day: PlanDay): string[] {
  const name = dayTitle(day.dayName);
  return [
    `Make ${name} easier`,
    `We're eating out ${name}`,
    `Give ${name} something different`,
  ];
}

/**
 * TAPPING A DAY OPENS THE DAY SHEET (ledger §D, `1l`).
 *
 * The SAME SHELL as the meal sheet with the first line and the primary swapped
 * — and "same shell" is meant literally: both render inside ONE `PlanSheet`
 * drawer, so opening a meal from a day REPLACES the day rather than stacking a
 * second sheet over it. `1m` (expanding the day in the rail instead) stays held
 * — it needs a real week of use, not another frame.
 */
export function DaySheetContent({
  day,
  onModify,
  onTalkToChef,
  onOpenMeal,
  isModifying,
  workingLabel,
  modifyError,
}: {
  day: PlanDay;
  onModify: (request: string) => void;
  onTalkToChef: () => void;
  onOpenMeal: (meal: DisplayMeal) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
}) {
  const cooking = day.meals.filter((m) => m.title);
  // The claim the day makes. One meal and the day IS that meal, so saying
  // "1 meal planned" over a single dinner would be a count nobody asked for.
  const title =
    cooking.length === 0
      ? "Nothing planned yet"
      : cooking.length === 1
        ? (cooking[0]!.title ?? "Nothing planned yet")
        : `${cooking.length} meals planned`;

  return (
    <SheetBody>
      <SheetIdentity
        eyebrow={`${shortDayName(day.date).toUpperCase()} ${dayOfMonth(day.date)} · ${dayTitle(day.dayName)}`}
        title={title}
        meta={cooking.length === 1 ? metaLine(cooking[0]!) : null}
        rationale={cooking.length === 1 ? cooking[0]!.rationale : null}
      />

      {day.meals.length > 0 ? (
        <SheetGroup label="ON THIS DAY">
          {day.meals.map((meal) => (
            <SheetRow
              key={meal.id ?? `${day.date}-${meal.mealType}`}
              label={meal.title ?? "Not decided yet"}
              sublabel={meal.mealType.toUpperCase()}
              onClick={() => onOpenMeal(meal)}
            />
          ))}
        </SheetGroup>
      ) : null}

      <SheetGroup label="ASK ME FOR A CHANGE">
        {dayChips(day).map((chip) => (
          <SheetChip
            key={chip}
            label={chip}
            disabled={isModifying}
            onClick={() => onModify(chip)}
          />
        ))}
        <SheetChip
          label="Something else? Tell your chef"
          disabled={isModifying}
          onClick={onTalkToChef}
        />
      </SheetGroup>

      <SheetStatus
        working={isModifying ? (workingLabel ?? "Reworking your plan…") : null}
        error={isModifying ? null : modifyError}
      />
    </SheetBody>
  );
}

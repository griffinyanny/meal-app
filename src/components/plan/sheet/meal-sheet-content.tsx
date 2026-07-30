"use client";

import {
  type DisplayMeal,
  type HydrationView,
  dayTitle,
  isCookable,
  scopedRequest,
} from "../plan-helpers";
import { dayOfMonth, metaLine, shortDayName } from "../rail-helpers";
import {
  LibraryDoor,
  SheetBody,
  SheetChip,
  SheetGroup,
  SheetIdentity,
  SheetRow,
  SheetStatus,
} from "./sheet-parts";
import type { PickerInvocation } from "../picker/picker-content";

/**
 * THE MEAL SHEET IS A SUMMARY (ledger §D · W7). **Closes BUG-006.**
 *
 * It used to embed the entire `RecipeView` — every ingredient, every step —
 * which made Plan a second, worse Recipes tab and buried the one thing the
 * sheet is for: the chef's argument for this dish on this night. Ingredients
 * and steps never enter Plan now; a row leaves for Recipes, where they live.
 *
 * That is a real subtraction, not only a tidy-up: reading the full recipe while
 * reviewing the week used to happen here. The trade the ledger makes is that
 * the recipe is one tap away in the place that owns it, and Plan stays a
 * surface you decide on rather than one you cook from.
 */
interface MealSheetContentProps {
  meal: DisplayMeal;
  onModify: (request: string) => void;
  onTalkToChef: () => void;
  onOpenPicker: (invocation: PickerInvocation) => void;
  isModifying: boolean;
  workingLabel?: string;
  modifyError?: string | null;
  hydration?: HydrationView;
}

export function MealSheetContent({
  meal,
  onModify,
  onTalkToChef,
  onOpenPicker,
  isModifying,
  workingLabel,
  modifyError,
  hydration,
}: MealSheetContentProps) {
  // The first line — day and meal first (wave 1, "B's order"). This is the one
  // line the DAY sheet swaps; everything below it is shared.
  const eyebrow = [
    meal.date ? `${shortDayName(meal.date).toUpperCase()} ${dayOfMonth(meal.date)}` : null,
    meal.mealType.toUpperCase(),
    meal.relative,
  ]
    .filter(Boolean)
    .join(" · ");

  const chips = [
    ...meal.chips,
    // The escape hatch the drawing names: everything above changes the dish,
    // this one changes what the dish IS.
    "Swap the whole meal",
  ];

  return (
    <SheetBody>
      <SheetIdentity
        eyebrow={eyebrow}
        title={meal.title ?? "Not decided yet"}
        meta={metaLine(meal)}
        rationale={meal.rationale}
      />

      <SheetGroup label="ASK ME FOR A CHANGE">
        {chips.map((chip) => (
          <SheetChip
            key={chip}
            label={chip}
            disabled={isModifying}
            onClick={() => onModify(scopedRequest(chip, meal))}
          />
        ))}
        {/* `3e` · the picker, invoked from a meal — FILED WITH THE CHANGES, not
            under navigation (S48, critic's finding): it rewrites the night, so
            it belongs beneath `Swap the whole meal`, where the two lines
            together are the thesis — the chef can swap it, or you can hand it
            one of yours. Still drawn as a ROW because it opens a surface
            rather than firing a request; the group's rule is what a control
            DOES to the week, and this one changes it. */}
        {isCookable(meal.slotType) ? (
          <LibraryDoor
            sublabel={`I'll rebuild ${dayTitle(meal.dayName)} around it`}
            onClick={() =>
              onOpenPicker({
                headline: `${dayTitle(meal.dayName)} ${meal.mealType}, from your recipes`,
                subline: meal.title ? `Replacing ${meal.title}` : null,
                dayName: dayTitle(meal.dayName),
                replacingDate: meal.date,
                // The night's ceiling comes from the meal it is replacing —
                // that is the only honest read of "how long you've got on a
                // Thursday" we hold. With no time on the slot there is no
                // constraint, and the picker dims nothing rather than inventing
                // a limit to dim against.
                constraint: meal.estTimeMinutes
                  ? {
                      maxMinutes: meal.estTimeMinutes,
                      dayName: dayTitle(meal.dayName),
                    }
                  : null,
              })
            }
          />
        ) : null}
        {/* Free text as ONE row, in the chip group because it asks the chef —
            the rule is what the control does, not how it is drawn. */}
        <SheetChip
          label="Something else? Tell your chef"
          disabled={isModifying}
          onClick={onTalkToChef}
        />
      </SheetGroup>

      {isCookable(meal.slotType) ? (
        <SheetGroup label="TAKE IT SOMEWHERE">
          <RecipeRow meal={meal} hydration={hydration} />
        </SheetGroup>
      ) : null}

      <SheetStatus
        working={isModifying ? (workingLabel ?? "Reworking your plan…") : null}
        error={isModifying ? null : modifyError}
      />
    </SheetBody>
  );
}

/**
 * The one row that leaves Plan.
 *
 * It states its own state instead of pretending: a recipe still being written
 * is not a link, and a recipe that failed to write says so rather than showing
 * a door that goes nowhere. Ingredients and steps are on the other side of it,
 * never on this one.
 */
function RecipeRow({
  meal,
  hydration,
}: {
  meal: DisplayMeal;
  hydration?: HydrationView;
}) {
  if (meal.recipeStatus === "ready" && meal.recipeId) {
    return (
      <SheetRow
        label="View full recipe"
        sublabel="Ingredients and steps live in Recipes"
        href={`/recipes/${meal.recipeId}`}
      />
    );
  }

  if (hydration === "failed") {
    return (
      <SheetRow
        label="The full recipe didn't come together"
        sublabel={`${dayTitle(meal.dayName)}'s plan is still good — the write-up isn't.`}
        disabled
      />
    );
  }

  return (
    <SheetRow
      label="Still writing the full recipe"
      sublabel="It'll be in Recipes when it lands"
      disabled
    />
  );
}

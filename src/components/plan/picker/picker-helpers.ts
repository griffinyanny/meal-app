// The picker's content rules (Phase 1E.5 · W8, ledger §A, frames `3b`–`3e`).
//
// Pure and separately testable, because every one of these is a product claim
// rather than a rendering detail: what "stale" means, what a browse tile counts,
// and what makes a recipe unfittable are the things the picker is FOR.
import type { RecipeListItem } from "@/components/recipes/types";
import { isPlanDraft } from "@/components/recipes/types";

/** What the day/meal invocation constrains the library by (frame `3e`). */
export interface SlotConstraint {
  /** How long the person has on that night, in minutes. */
  maxMinutes: number;
  /** "Thursday" — used in the reason an unfittable recipe gives. */
  dayName: string;
}

export interface PickerRecipe {
  id: string;
  title: string;
  /** "Saved in March · 25 min · never cooked" — the row's own second line. */
  meta: string;
  /** Set when the recipe cannot fit the slot. It DIMS AND SAYS WHY (§A). */
  unfittableReason: string | null;
}

export type TileKey = "cooked" | "recent" | "imported" | "everything" | "fits";

export interface BrowseTile {
  key: TileKey;
  label: string;
  count: number;
}

/**
 * The library, as the picker means it.
 *
 * A plan draft is NOT library content: it is a recipe the chef wrote for a week
 * that is still on screen, and offering it back as something to "cook again"
 * would let the person pick this week's dinner to put into this week.
 */
export function libraryOf(items: RecipeListItem[]): RecipeListItem[] {
  return items.filter((r) => !isPlanDraft(r));
}

/**
 * `Saved, never cooked` — the picker's opening content, and the one read only
 * this product has (build dependency 1).
 *
 * Deliberately a real query over two columns that already exist, not an
 * inference: `lastCookedAt` is populated by the S27 cooked-signal harvest and
 * `sourcePlanId` distinguishes a kept recipe from a plan's leftovers.
 */
export function savedNeverCooked(items: RecipeListItem[]): RecipeListItem[] {
  return libraryOf(items).filter((r) => r.lastCookedAt == null);
}

export function cookedBefore(items: RecipeListItem[]): RecipeListItem[] {
  return libraryOf(items).filter((r) => r.lastCookedAt != null);
}

export function importedRecipes(items: RecipeListItem[]): RecipeListItem[] {
  return libraryOf(items).filter((r) => r.sourceType === "url_import");
}

/**
 * Recipes that fit the night. Only ever a browse tile when a night is named —
 * on the intent screen there is no slot to fit, so the fourth tile is the plain
 * `Recently saved` (frames `3b` vs `3e`).
 */
export function fitsSlot(
  items: RecipeListItem[],
  constraint: SlotConstraint
): RecipeListItem[] {
  return libraryOf(items).filter(
    (r) => r.totalTimeMinutes == null || r.totalTimeMinutes <= constraint.maxMinutes
  );
}

/**
 * BROWSE IS FOUR NAMED TILES WITH COUNTS, NEVER FILTER CHIPS (§A).
 *
 * A chip implies subtraction from a list you can already see; a tile implies a
 * door. The counts are the whole affordance — a door with no number on it is
 * just a word.
 */
export function browseTiles(
  items: RecipeListItem[],
  constraint?: SlotConstraint | null
): BrowseTile[] {
  const lib = libraryOf(items);
  const everything: BrowseTile = {
    key: "everything",
    label: "Everything",
    count: lib.length,
  };
  const cooked: BrowseTile = {
    key: "cooked",
    label: "Cooked before",
    count: cookedBefore(items).length,
  };
  const imported: BrowseTile = {
    key: "imported",
    label: "Imported",
    count: importedRecipes(items).length,
  };

  // `3e`: with a night named, ONE tile swaps — the constraint the day imposes
  // replaces the softest of the four. Nothing else about the picker moves.
  if (constraint) {
    return [
      cooked,
      {
        key: "fits",
        label: `Under ${constraint.maxMinutes} min`,
        count: fitsSlot(items, constraint).length,
      },
      { key: "recent", label: "Recently saved", count: recentlySaved(items).length },
      everything,
    ];
  }

  return [
    cooked,
    { key: "recent", label: "Recently saved", count: recentlySaved(items).length },
    imported,
    everything,
  ];
}

// `recipe.list` returns newest-first, so "recently saved" is a slice of the
// library in the order it already arrives.
const RECENT_WINDOW = 12;

export function recentlySaved(items: RecipeListItem[]): RecipeListItem[] {
  return libraryOf(items).slice(0, RECENT_WINDOW);
}

export function tileContents(
  items: RecipeListItem[],
  key: TileKey,
  constraint?: SlotConstraint | null
): RecipeListItem[] {
  switch (key) {
    case "cooked":
      return cookedBefore(items);
    case "recent":
      return recentlySaved(items);
    case "imported":
      return importedRecipes(items);
    case "fits":
      return constraint ? fitsSlot(items, constraint) : libraryOf(items);
    case "everything":
      return libraryOf(items);
  }
}

// "Saved in March", from createdAt. Read in UTC for the same reason
// formatCookedDate does — the stamp is a calendar fact, not a local moment.
function savedMonth(value: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

/**
 * A row, ready to render — including the reason it cannot be chosen.
 *
 * A RECIPE THAT CANNOT FIT THE SLOT DIMS AND SAYS WHY, RATHER THAN VANISHING
 * (§A). Disappearing rows make the library feel smaller than it is, and the
 * reason is the useful part: "3 hr — longer than Thursday allows" teaches the
 * constraint, while an absent row teaches nothing.
 */
export function toPickerRecipe(
  r: RecipeListItem,
  constraint?: SlotConstraint | null
): PickerRecipe {
  const over =
    constraint != null &&
    r.totalTimeMinutes != null &&
    r.totalTimeMinutes > constraint.maxMinutes;

  const meta = [
    savedMonth(r.createdAt) ? `Saved in ${savedMonth(r.createdAt)}` : null,
    r.totalTimeMinutes ? `${r.totalTimeMinutes} min` : null,
    r.lastCookedAt == null ? "never cooked" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: r.id,
    title: r.title,
    meta,
    unfittableReason: over
      ? `${formatHours(r.totalTimeMinutes!)} — longer than ${constraint!.dayName} allows`
      : null,
  };
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/**
 * The count, in the verb (`Give the chef these two`).
 *
 * §A puts the number IN THE VERB rather than in a badge, so the primary always
 * states what pressing it does. Spelled out to three because "these 2" reads as
 * a receipt and the chef does not talk like a receipt.
 */
const SPELLED = ["", "one", "two", "three", "four"];

export function pickVerb(count: number, dayName?: string | null): string {
  // A NAMED NIGHT ONLY SURVIVES A SINGLE PICK, and the reason is mechanical
  // rather than stylistic: the `3e` invocation replaces ONE slot, and
  // `validateModification` dedupes changed meals by dayOffset — so two recipes
  // cannot both land on Friday no matter what the button says.
  //
  // This took two passes to get right. The first dropped §A's count on this
  // branch ("Put these on Friday"), which hid how many were selected when one
  // was scrolled out of sight. The second added the count back ("Put these two
  // on Friday") and made the sentence *precisely* wrong: it now promised a
  // placement the product cannot perform. Both passes assumed the NIGHT was
  // the fixed part. §B says the opposite — a chosen recipe is a constraint on
  // the chef, not a scheduler — so above one pick the night goes back to the
  // chef and §A's own multi-select copy applies.
  if (dayName && count === 1) return `Put it on ${dayName}`;
  if (count === 1) return "Give the chef this one";
  return `Give the chef these ${SPELLED[count] ?? String(count)}`;
}

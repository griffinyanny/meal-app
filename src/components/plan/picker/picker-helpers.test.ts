import { describe, it, expect } from "vitest";
import type { RecipeListItem } from "@/components/recipes/types";
import {
  browseTiles,
  cookedBefore,
  fitsSlot,
  libraryOf,
  pickVerb,
  savedNeverCooked,
  tileContents,
  toPickerRecipe,
  type SlotConstraint,
} from "./picker-helpers";

// Only the columns the picker reads. Cast once here rather than in every test,
// so a real schema change surfaces as one failure instead of thirty.
function recipe(overrides: Partial<RecipeListItem> = {}): RecipeListItem {
  return {
    id: "r1",
    title: "Spaghetti alla Carbonara",
    createdAt: new Date("2026-03-14T12:00:00Z"),
    lastCookedAt: null,
    sourcePlanId: null,
    sourceType: "ai_generated",
    totalTimeMinutes: 40,
    servings: 4,
    ...overrides,
  } as RecipeListItem;
}

const THURSDAY: SlotConstraint = { maxMinutes: 40, dayName: "Thursday" };

describe("libraryOf", () => {
  it("should exclude a plan draft, which is this week's dinner and not a saved recipe", () => {
    const items = [recipe({ id: "a" }), recipe({ id: "b", sourcePlanId: "plan-1" })];

    expect(libraryOf(items).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("savedNeverCooked", () => {
  it("should return only kept recipes that have never been cooked", () => {
    const items = [
      recipe({ id: "never" }),
      recipe({ id: "cooked", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
      recipe({ id: "draft", sourcePlanId: "plan-1" }),
    ];

    expect(savedNeverCooked(items).map((r) => r.id)).toEqual(["never"]);
  });

  it("should be empty rather than throw on an empty library", () => {
    expect(savedNeverCooked([])).toEqual([]);
  });
});

describe("cookedBefore", () => {
  it("should return only recipes with a cooked stamp", () => {
    const items = [
      recipe({ id: "never" }),
      recipe({ id: "cooked", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
    ];

    expect(cookedBefore(items).map((r) => r.id)).toEqual(["cooked"]);
  });
});

describe("fitsSlot", () => {
  it("should keep a recipe at exactly the ceiling", () => {
    const items = [recipe({ id: "exactly", totalTimeMinutes: 40 })];

    expect(fitsSlot(items, THURSDAY).map((r) => r.id)).toEqual(["exactly"]);
  });

  it("should drop a recipe that runs longer than the night allows", () => {
    const items = [recipe({ id: "lamb", totalTimeMinutes: 180 })];

    expect(fitsSlot(items, THURSDAY)).toEqual([]);
  });

  it("should keep a recipe with no time at all rather than guess it is too long", () => {
    const items = [recipe({ id: "untimed", totalTimeMinutes: null })];

    expect(fitsSlot(items, THURSDAY).map((r) => r.id)).toEqual(["untimed"]);
  });
});

describe("browseTiles", () => {
  it("should offer four doors with counts on the intent screen", () => {
    const items = [
      recipe({ id: "a" }),
      recipe({ id: "b", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
      recipe({ id: "c", sourceType: "url_import" }),
    ];

    const tiles = browseTiles(items);

    expect(tiles).toHaveLength(4);
    expect(tiles.map((t) => t.key)).toEqual([
      "cooked",
      "recent",
      "imported",
      "everything",
    ]);
    expect(tiles.find((t) => t.key === "cooked")?.count).toBe(1);
    expect(tiles.find((t) => t.key === "imported")?.count).toBe(1);
    expect(tiles.find((t) => t.key === "everything")?.count).toBe(3);
  });

  it("should swap exactly one tile for the night's constraint when a day is named", () => {
    const items = [
      recipe({ id: "quick", totalTimeMinutes: 25 }),
      recipe({ id: "lamb", totalTimeMinutes: 180 }),
    ];

    const tiles = browseTiles(items, THURSDAY);

    expect(tiles).toHaveLength(4);
    // `3e`: the constraint tile replaces one door; the other three hold.
    expect(tiles.map((t) => t.key)).toEqual([
      "cooked",
      "fits",
      "recent",
      "everything",
    ]);
    expect(tiles.find((t) => t.key === "fits")?.label).toBe("Under 40 min");
    expect(tiles.find((t) => t.key === "fits")?.count).toBe(1);
  });

  it("should count zero rather than hide a door on an empty library", () => {
    const tiles = browseTiles([]);

    expect(tiles).toHaveLength(4);
    expect(tiles.every((t) => t.count === 0)).toBe(true);
  });
});

describe("tileContents", () => {
  it("should return the whole library behind Everything, drafts excluded", () => {
    const items = [recipe({ id: "a" }), recipe({ id: "d", sourcePlanId: "p" })];

    expect(tileContents(items, "everything").map((r) => r.id)).toEqual(["a"]);
  });

  it("should fall back to the whole library for the fits tile with no constraint", () => {
    const items = [recipe({ id: "lamb", totalTimeMinutes: 180 })];

    expect(tileContents(items, "fits", null).map((r) => r.id)).toEqual(["lamb"]);
  });
});

describe("toPickerRecipe", () => {
  it("should build the row's own second line from when it was saved and whether it was cooked", () => {
    const row = toPickerRecipe(recipe({ totalTimeMinutes: 25 }));

    expect(row.meta).toBe("Saved in March · 25 min · never cooked");
    expect(row.unfittableReason).toBeNull();
  });

  it("should drop the never-cooked clause once it has been cooked", () => {
    const row = toPickerRecipe(
      recipe({ lastCookedAt: new Date("2026-05-02T12:00:00Z") })
    );

    expect(row.meta).toBe("Saved in March · 40 min");
  });

  it("should say WHY a recipe cannot fit the night rather than hiding it", () => {
    const row = toPickerRecipe(recipe({ totalTimeMinutes: 180 }), THURSDAY);

    expect(row.unfittableReason).toBe("3 hr — longer than Thursday allows");
  });

  it("should report a long cook in hours and minutes, not raw minutes", () => {
    const row = toPickerRecipe(recipe({ totalTimeMinutes: 95 }), THURSDAY);

    expect(row.unfittableReason).toBe("1 hr 35 min — longer than Thursday allows");
  });

  it("should survive a recipe with no saved date and no time", () => {
    const row = toPickerRecipe(
      recipe({ createdAt: null as unknown as Date, totalTimeMinutes: null })
    );

    expect(row.meta).toBe("never cooked");
    expect(row.unfittableReason).toBeNull();
  });
});

describe("pickVerb", () => {
  it("should put the count in the verb, spelled out", () => {
    expect(pickVerb(1)).toBe("Give the chef this one");
    expect(pickVerb(2)).toBe("Give the chef these two");
    expect(pickVerb(3)).toBe("Give the chef these three");
  });

  it("should name the destination when a night is already decided", () => {
    // `3e`: with a slot chosen the primary names it.
    expect(pickVerb(1, "Thursday")).toBe("Put it on Thursday");
  });

  it("should hand the night back to the chef above one pick, even when one was named", () => {
    // The `3e` invocation replaces ONE slot and `validateModification` dedupes
    // changed meals by dayOffset, so two recipes CANNOT both land on Thursday.
    // A primary that says they will is precisely wrong rather than merely
    // vague, and §B settles which half gives: the dish is the constraint, the
    // night is the chef's. So above one pick this falls back to §A's own
    // multi-select copy, which carries the count.
    expect(pickVerb(2, "Thursday")).toBe("Give the chef these two");
    expect(pickVerb(3, "Thursday")).toBe("Give the chef these three");
  });
});

import { describe, it, expect } from "vitest";
import type { RecipeListItem } from "@/components/recipes/types";
import {
  browseTiles,
  cookedBefore,
  fitsSlot,
  fittingCount,
  libraryOf,
  openingList,
  pickReceipt,
  pickVerb,
  savedNeverCooked,
  tileContents,
  tileHeading,
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
  it("should suppress a door whose count is zero and a door identical to Everything", () => {
    // Three recipes: one cooked, one imported, none of them recent enough to
    // differ — `recent` is a 12-slice, so on a 3-recipe library it IS
    // `everything`, and a five-recipe R1 library shows the same twice. Two
    // honest doors beat four with two fake (S48, critic's finding).
    const items = [
      recipe({ id: "a" }),
      recipe({ id: "b", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
      recipe({ id: "c", sourceType: "url_import" }),
    ];

    const tiles = browseTiles(items);

    expect(tiles.map((t) => t.key)).toEqual(["cooked", "imported", "everything"]);
    expect(tiles.find((t) => t.key === "cooked")?.count).toBe(1);
    expect(tiles.find((t) => t.key === "imported")?.count).toBe(1);
    expect(tiles.find((t) => t.key === "everything")?.count).toBe(3);
  });

  it("should keep all four doors when every one of them is distinct", () => {
    // Thirteen recipes is the first library where `recent`'s 12-slice differs
    // from `everything` — the suppression rule must NOT fire here.
    const items = [
      ...Array.from({ length: 12 }, (_, i) => recipe({ id: `r${i}` })),
      recipe({ id: "cooked", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
      recipe({ id: "imported", sourceType: "url_import" }),
    ];

    const tiles = browseTiles(items);

    expect(tiles.map((t) => t.key)).toEqual([
      "cooked",
      "recent",
      "imported",
      "everything",
    ]);
  });

  it("should swap exactly one tile for the night's constraint when a day is named", () => {
    const items = [
      recipe({ id: "quick", totalTimeMinutes: 25 }),
      recipe({ id: "lamb", totalTimeMinutes: 180 }),
      recipe({ id: "cooked", lastCookedAt: new Date("2026-05-01T12:00:00Z") }),
    ];

    const tiles = browseTiles(items, THURSDAY);

    // `3e`: the constraint tile replaces the softest door. `recent` (3 === 3)
    // is suppressed as Everything's duplicate; `fits` (2 of 3) survives.
    expect(tiles.map((t) => t.key)).toEqual(["cooked", "fits", "everything"]);
    expect(tiles.find((t) => t.key === "fits")?.label).toBe("Under 40 min");
    expect(tiles.find((t) => t.key === "fits")?.count).toBe(2);
  });

  it("should reduce an empty library to the one honest door", () => {
    // Every count is zero, so every suppressible door goes — `everything`
    // stays at zero, which is what `libraryEmpty` reads to show the empty
    // state instead of the tiles.
    const tiles = browseTiles([]);

    expect(tiles.map((t) => t.key)).toEqual(["everything"]);
    expect(tiles[0]!.count).toBe(0);
  });
});

describe("openingList", () => {
  it("should cap the opening tier at three and count the remainder", () => {
    // Frame `3b`'s own drawing: three rows, then `Six more`. The doors below
    // the tier are the way THROUGH the library, so the tier cannot bury them.
    const items = Array.from({ length: 9 }, (_, i) => recipe({ id: `r${i}` }));

    const { shown, moreCount } = openingList(items);

    expect(shown.map((r) => r.id)).toEqual(["r0", "r1", "r2"]);
    expect(moreCount).toBe(6);
  });

  it("should show everything with no more-door when the tier fits the cap", () => {
    const items = [recipe({ id: "a" }), recipe({ id: "b" })];

    const { shown, moreCount } = openingList(items);

    expect(shown).toHaveLength(2);
    expect(moreCount).toBe(0);
  });
});

describe("tileHeading", () => {
  it("should name the pushed stale door, which is not a browse tile", () => {
    expect(tileHeading("stale", [])).toBe("Saved, never cooked");
  });

  it("should read a browse tile's heading off the tile itself", () => {
    expect(
      tileHeading("cooked", [{ key: "cooked", label: "Cooked before", count: 2 }])
    ).toBe("Cooked before");
  });
});

describe("pickReceipt", () => {
  it("should name two picks the way a sentence would", () => {
    expect(pickReceipt(["Carbonara", "Green Beans"])).toBe(
      "Carbonara and Green Beans."
    );
  });

  it("should serial-comma three or more", () => {
    expect(pickReceipt(["A", "B", "C"])).toBe("A, B, and C.");
  });
});

describe("fittingCount", () => {
  it("should count the rows that carry no unfittable reason", () => {
    expect(
      fittingCount([
        { unfittableReason: null },
        { unfittableReason: "3 hr · longer than Thursday allows" },
        { unfittableReason: null },
      ])
    ).toBe(2);
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

    expect(row.unfittableReason).toBe("3 hr · longer than Thursday allows");
  });

  it("should report a long cook in hours and minutes, not raw minutes", () => {
    const row = toPickerRecipe(recipe({ totalTimeMinutes: 95 }), THURSDAY);

    expect(row.unfittableReason).toBe("1 hr 35 min · longer than Thursday allows");
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

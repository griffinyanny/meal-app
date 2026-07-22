import { describe, it, expect } from "vitest";
import {
  parseQuantity,
  parseQtyText,
  numberFromQty,
  aggregateIngredients,
  type NormalizedLine,
} from "./aggregate";

// A NormalizedLine builder with sane, high-confidence defaults so each test only
// states the fields it cares about.
function line(overrides: Partial<NormalizedLine> = {}): NormalizedLine {
  return {
    rawQty: "1",
    rawUnit: "cup",
    rawItem: "flour",
    canonicalName: "flour",
    canonicalUnit: "cup",
    category: "pantry",
    numericQty: null,
    confidence: 1,
    recipeId: "r1",
    recipeTitle: "Recipe One",
    ...overrides,
  };
}

describe("parseQuantity", () => {
  it("parses integers and decimals", () => {
    expect(parseQuantity("2")).toEqual({ kind: "exact", value: 2 });
    expect(parseQuantity("1.5")).toEqual({ kind: "exact", value: 1.5 });
  });

  it("parses simple and mixed fractions", () => {
    expect(parseQuantity("1/2")).toEqual({ kind: "exact", value: 0.5 });
    expect(parseQuantity("1 1/2")).toEqual({ kind: "exact", value: 1.5 });
    expect(parseQuantity("3/4")).toEqual({ kind: "exact", value: 0.75 });
  });

  it("parses unicode fractions, standalone and mixed", () => {
    expect(parseQuantity("½")).toEqual({ kind: "exact", value: 0.5 });
    expect(parseQuantity("1½")).toEqual({ kind: "exact", value: 1.5 });
    expect(parseQuantity("¼")).toEqual({ kind: "exact", value: 0.25 });
  });

  it("resolves ranges to the higher end and flags them", () => {
    expect(parseQuantity("2-3")).toEqual({ kind: "range", value: 3 });
    expect(parseQuantity("2 to 3")).toEqual({ kind: "range", value: 3 });
    expect(parseQuantity("2–3")).toEqual({ kind: "range", value: 3 }); // en dash
    expect(parseQuantity("1/2-3/4")).toEqual({ kind: "range", value: 0.75 });
  });

  it("treats empty and 'as needed' phrases as unquantified", () => {
    expect(parseQuantity("")).toEqual({ kind: "unquantified" });
    expect(parseQuantity("   ")).toEqual({ kind: "unquantified" });
    expect(parseQuantity("a pinch")).toEqual({ kind: "unquantified" });
    expect(parseQuantity("to taste")).toEqual({ kind: "unquantified" });
    expect(parseQuantity("handful")).toEqual({ kind: "unquantified" });
  });

  it("lets a leading number win over an 'as needed' word", () => {
    expect(parseQuantity("1 pinch")).toEqual({ kind: "exact", value: 1 });
  });

  it("extracts a leading count from a string with trailing noise", () => {
    expect(parseQuantity("2 (14 oz cans)")).toEqual({ kind: "exact", value: 2 });
  });

  it("marks genuinely unreadable strings unparseable", () => {
    expect(parseQuantity("abc")).toEqual({ kind: "unparseable" });
  });
});

describe("aggregateIngredients — merging", () => {
  it("returns [] for no lines", () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it("keeps a single line as one un-merged item with its source", () => {
    const [item] = aggregateIngredients([
      line({ rawQty: "2", canonicalUnit: "cup", canonicalName: "rice" }),
    ]);
    expect(item.name).toBe("rice");
    expect(item.quantity).toBe(2);
    expect(item.unit).toBe("cup");
    expect(item.sources).toHaveLength(1);
    expect(item.sources[0]).toMatchObject({ recipeId: "r1", qty: "2", unit: "cup" });
  });

  it("merges same canonical name + same unit and sums the quantities", () => {
    const items = aggregateIngredients([
      line({ rawQty: "2", canonicalUnit: "cup", canonicalName: "broth", recipeId: "r1" }),
      line({ rawQty: "1", canonicalUnit: "cup", canonicalName: "broth", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].unit).toBe("cup");
    expect(items[0].sources).toHaveLength(2); // ⇒ amber "summed across meals" in Slice C
  });

  it("groups canonical names case-insensitively", () => {
    // A non-staple item so this tests the case-insensitive grouping mechanic itself
    // (buy-unit staples like "olive oil" collapse to an unquantified row — see the
    // buy-unit describe block).
    const items = aggregateIngredients([
      line({ canonicalName: "Chicken Broth", rawQty: "1", canonicalUnit: "cup" }),
      line({ canonicalName: "chicken broth", rawQty: "2", canonicalUnit: "cup" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("under-merges: same name, different unit ⇒ two separate rows", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "garlic", rawQty: "2", canonicalUnit: "cloves" }),
      line({ canonicalName: "garlic", rawQty: "1", canonicalUnit: "tbsp" }),
    ]);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.sources.length === 1)).toBe(true);
  });

  it("under-merges: different canonical names never combine", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "cherry tomatoes", rawItem: "cherry tomatoes" }),
      line({ canonicalName: "roma tomatoes", rawItem: "roma tomatoes" }),
    ]);
    expect(items).toHaveLength(2);
  });

  it("under-merges: a low-confidence line never joins a matching group", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "cumin", canonicalUnit: "tsp", rawQty: "1", confidence: 1 }),
      line({ canonicalName: "cumin", canonicalUnit: "tsp", rawQty: "1", confidence: 0.2 }),
    ]);
    expect(items).toHaveLength(2); // the uncertain one stays solo
  });
});

describe("aggregateIngredients — quantities", () => {
  it("sums fractions cleanly (no float dust)", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "sugar", canonicalUnit: "cup", rawQty: "0.1", recipeId: "r1" }),
      line({ canonicalName: "sugar", canonicalUnit: "cup", rawQty: "0.2", recipeId: "r2" }),
    ]);
    expect(items[0].quantity).toBe(0.3);
  });

  it("adds a range's higher end into the merged total", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "garlic", canonicalUnit: "cloves", rawQty: "2", recipeId: "r1" }),
      line({ canonicalName: "garlic", canonicalUnit: "cloves", rawQty: "2-3", recipeId: "r2" }),
    ]);
    expect(items[0].quantity).toBe(5); // 2 + 3
    expect(items[0].sources).toHaveLength(2);
  });

  it("yields a null quantity for an all-unquantified item", () => {
    const [item] = aggregateIngredients([
      line({ canonicalName: "salt", canonicalUnit: "", rawQty: "to taste", rawUnit: "" }),
    ]);
    expect(item.quantity).toBeNull();
    expect(item.unit).toBeNull();
  });

  it("sums the quantified members and ignores an unquantified one in the same group", () => {
    // Non-staple item: the mechanic under test is "an unquantified line in a merged
    // group contributes no number." (Staples take a different path — see below.)
    const items = aggregateIngredients([
      line({ canonicalName: "chicken broth", canonicalUnit: "cup", rawQty: "2", recipeId: "r1" }),
      line({ canonicalName: "chicken broth", canonicalUnit: "cup", rawQty: "a drizzle", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].sources).toHaveLength(2);
  });

  it("falls back to the AI numericQty for an unreadable string, kept solo", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "yeast", canonicalUnit: "packet", rawQty: "2", recipeId: "r1" }),
      line({
        canonicalName: "yeast",
        canonicalUnit: "packet",
        rawQty: "one and a bit",
        numericQty: 1,
        recipeId: "r2",
      }),
    ]);
    // The unreadable line uses the AI's 1 but stays its own row (never summed).
    expect(items).toHaveLength(2);
    const fallback = items.find((i) => i.sources[0].recipeId === "r2");
    expect(fallback?.quantity).toBe(1);
  });

  it("is null (not fabricated) for an unreadable string with no AI fallback", () => {
    const [item] = aggregateIngredients([
      line({ rawQty: "some amount", numericQty: null }),
    ]);
    expect(item.quantity).toBeNull();
  });
});

// BUG-002: the same shoppable item split across rows because the aggregator
// (correctly) won't merge a measured line with an unquantified one, or across
// units. The buy-unit table consolidates a hand-picked set of items into one row.
describe("aggregateIngredients — buy-unit consolidation (BUG-002)", () => {
  it("collapses a staple's measured line and its 'to taste' line into one unquantified row", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "salt", canonicalUnit: "tsp", rawQty: "3.25", category: "spices", recipeId: "r1" }),
      line({ canonicalName: "salt", canonicalUnit: "", rawQty: "to taste", rawUnit: "", category: "spices", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("salt");
    expect(items[0].quantity).toBeNull();
    expect(items[0].unit).toBeNull();
    expect(items[0].sources).toHaveLength(2); // amber dot; per-meal breakdown survives
  });

  it("collapses a spice measured with a unit and with no unit into one row", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "black pepper", canonicalUnit: "tsp", rawQty: "2.25", category: "spices", recipeId: "r1" }),
      line({ canonicalName: "black pepper", canonicalUnit: "", rawQty: "1", rawUnit: "", category: "spices", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBeNull(); // staple: the number is shopping noise
  });

  it("drops the noise quantity even when every staple line is measured", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "olive oil", canonicalUnit: "tbsp", rawQty: "2", category: "spices", recipeId: "r1" }),
      line({ canonicalName: "olive oil", canonicalUnit: "tbsp", rawQty: "1", category: "spices", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBeNull();
  });

  it("consolidates a buy-unit item across units — sums the buy-unit, absorbs the rest", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "carrot", canonicalUnit: "lb", rawQty: "1.5", category: "produce", recipeId: "r1" }),
      line({ canonicalName: "carrot", canonicalUnit: "cup", rawQty: "0.5", category: "produce", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("carrot");
    expect(items[0].quantity).toBe(1.5); // lb summed; the 0.5 cup absorbed, never converted
    expect(items[0].unit).toBe("lb");
    expect(items[0].sources).toHaveLength(2);
  });

  it("shows a real amount for a buy-unit item measured only in an off-unit (no blank row)", () => {
    const [item] = aggregateIngredients([
      line({ canonicalName: "carrot", canonicalUnit: "cup", rawQty: "0.5", category: "produce" }),
    ]);
    expect(item.quantity).toBe(0.5);
    expect(item.unit).toBe("cup");
  });

  it("still under-merges an item that is NOT in the buy-unit table", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "garlic", canonicalUnit: "clove", rawQty: "2", recipeId: "r1" }),
      line({ canonicalName: "garlic", canonicalUnit: "tbsp", rawQty: "1", recipeId: "r2" }),
    ]);
    expect(items).toHaveLength(2); // the table leaves the strict default untouched
  });
});

describe("aggregateIngredients — ordering", () => {
  it("orders items by aisle category then name", () => {
    const items = aggregateIngredients([
      line({ canonicalName: "flour", category: "pantry", canonicalUnit: "cup" }),
      line({ canonicalName: "apple", category: "produce", canonicalUnit: "" }),
      line({ canonicalName: "milk", category: "dairy", canonicalUnit: "cup" }),
    ]);
    expect(items.map((i) => i.category)).toEqual(["produce", "dairy", "pantry"]);
  });
});

// The inline quantity editor (editItem) passes a combined "number + unit" string.
// Fractions, unicode fractions and ranges must survive the glued-on unit — the
// regression the code review caught: "1½ cups" must not silently become "1 cups".
describe("parseQtyText — inline quantity editing", () => {
  it("should split a whole number and its unit", () => {
    expect(parseQtyText("2 heads")).toEqual({ quantity: 2, unit: "heads" });
  });

  it("should keep a unicode fraction when a unit is attached", () => {
    expect(parseQtyText("1½ cups")).toEqual({ quantity: 1.5, unit: "cups" });
  });

  it("should keep a bare unicode fraction (not blank the item)", () => {
    expect(parseQtyText("½ cup")).toEqual({ quantity: 0.5, unit: "cup" });
  });

  it("should read a mixed number with a unit", () => {
    expect(parseQtyText("1 1/2 cups")).toEqual({ quantity: 1.5, unit: "cups" });
  });

  it("should take the higher end of a range with a unit", () => {
    expect(parseQtyText("2-3 lbs")).toEqual({ quantity: 3, unit: "lbs" });
  });

  it("should handle a 'to' range with a unit", () => {
    expect(parseQtyText("2 to 3 lbs")).toEqual({ quantity: 3, unit: "lbs" });
  });

  it("should store a plain number with no unit", () => {
    expect(parseQtyText("3")).toEqual({ quantity: 3, unit: null });
  });

  it("should store no amount for empty or non-numeric text", () => {
    expect(parseQtyText("")).toEqual({ quantity: null, unit: null });
    expect(parseQtyText("as needed")).toEqual({ quantity: null, unit: null });
  });
});

describe("numberFromQty", () => {
  it("should read a number and null for no amount", () => {
    expect(numberFromQty("2")).toBe(2);
    expect(numberFromQty("1 1/2")).toBe(1.5);
    expect(numberFromQty("2-3")).toBe(3);
    expect(numberFromQty("a pinch")).toBeNull();
    expect(numberFromQty("")).toBeNull();
  });
});

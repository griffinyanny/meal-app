import { describe, it, expect } from "vitest";
import {
  validatePlan,
  validateModification,
  toSlotValues,
  type AIPlan,
  type AIPlanModification,
} from "./plan-types";

// 2026-05-24 is a Sunday — dayOffset 0 maps to it.
const WEEK_START = "2026-05-24";
const ctx = { weekStart: WEEK_START, defaultServings: 2 };

function meal(overrides: Partial<AIPlan["meals"][number]> = {}) {
  return {
    dayOffset: 0,
    slotType: "recipe" as const,
    title: "Miso-Glazed Salmon",
    description: "Salmon with bok choy",
    rationale: "Fresh fish right after the shopping run.",
    ingredientPreview: ["salmon", "bok choy", "ginger"],
    tags: ["Fish", "Asian"],
    estTimeMinutes: 35,
    servings: 2,
    chips: ["Make it spicier", "Swap protein"],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("should return a sorted, date-mapped plan for valid input", () => {
    const plan: AIPlan = {
      chefSummary: "  Built around a busy Thursday.  ",
      meals: [
        meal({ dayOffset: 2, title: "Beef Stir-Fry" }),
        meal({ dayOffset: 0, title: "Salmon" }),
      ],
    };

    const result = validatePlan(plan, ctx);

    expect(result.chefSummary).toBe("Built around a busy Thursday.");
    expect(result.meals).toHaveLength(2);
    expect(result.meals[0].date).toBe("2026-05-24");
    expect(result.meals[0].title).toBe("Salmon");
    expect(result.meals[1].date).toBe("2026-05-26");
  });

  it("should drop meals with an out-of-range dayOffset", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [meal({ dayOffset: 0 }), meal({ dayOffset: 7 }), meal({ dayOffset: -1 })],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].date).toBe("2026-05-24");
  });

  it("should keep only the first meal when a day is duplicated", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [
        meal({ dayOffset: 1, title: "First" }),
        meal({ dayOffset: 1, title: "Second" }),
      ],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].title).toBe("First");
  });

  it("should drop a cookable slot that has no title", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [meal({ dayOffset: 0, title: "  " }), meal({ dayOffset: 1, title: "Real" })],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].title).toBe("Real");
  });

  it("should keep an eating_out slot without a title and clear its concept fields", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [
        meal({
          dayOffset: 4,
          slotType: "eating_out",
          title: null,
          ingredientPreview: ["x"],
          chips: ["y"],
          tags: ["z"],
        }),
      ],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].slotType).toBe("eating_out");
    expect(result.meals[0].title).toBeNull();
    expect(result.meals[0].ingredientPreview).toEqual([]);
    expect(result.meals[0].chips).toEqual([]);
    expect(result.meals[0].tags).toEqual([]);
  });

  it("should clamp invalid numbers and sanitize arrays", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [
        meal({
          dayOffset: 0,
          estTimeMinutes: -10,
          servings: 0,
          ingredientPreview: ["  salmon  ", "", "ginger"],
          tags: ["a", "b", "c", "d", "e", "f", "g", "h"],
          chips: ["one", "two", "three"],
        }),
      ],
    };

    const result = validatePlan(plan, ctx);
    const m = result.meals[0];

    expect(m.estTimeMinutes).toBeNull();
    expect(m.servings).toBe(2); // fell back to defaultServings
    expect(m.ingredientPreview).toEqual(["salmon", "ginger"]);
    expect(m.tags).toHaveLength(6);
    expect(m.chips).toHaveLength(2);
  });

  it("should throw when no usable meals remain", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      meals: [meal({ dayOffset: 99 })],
    };

    expect(() => validatePlan(plan, ctx)).toThrow();
  });

  it("should throw when the chef summary is empty", () => {
    const plan: AIPlan = { chefSummary: "   ", meals: [meal()] };

    expect(() => validatePlan(plan, ctx)).toThrow();
  });
});

describe("validateModification", () => {
  it("should validate changed meals and map removed offsets to dates", () => {
    const mod: AIPlanModification = {
      chefResponse: "  Swapped Tuesday and cleared Thursday.  ",
      changedMeals: [meal({ dayOffset: 2, title: "Lighter Stir-Fry" })],
      removedDayOffsets: [4, 99],
    };

    const result = validateModification(mod, ctx);

    expect(result.chefResponse).toBe("Swapped Tuesday and cleared Thursday.");
    expect(result.changedMeals).toHaveLength(1);
    expect(result.changedMeals[0].date).toBe("2026-05-26");
    expect(result.removedDates).toEqual(["2026-05-28"]); // 99 filtered out
  });

  it("should dedupe changed meals by day and drop unusable ones", () => {
    const mod: AIPlanModification = {
      chefResponse: "Done.",
      changedMeals: [
        meal({ dayOffset: 1, title: "Keep" }),
        meal({ dayOffset: 1, title: "Drop dup" }),
        meal({ dayOffset: 0, title: "  " }),
      ],
      removedDayOffsets: [],
    };

    const result = validateModification(mod, ctx);

    expect(result.changedMeals).toHaveLength(1);
    expect(result.changedMeals[0].title).toBe("Keep");
  });
});

describe("toSlotValues", () => {
  it("should map a validated meal into the slot insert shape", () => {
    const plan = validatePlan({ chefSummary: "A week.", meals: [meal()] }, ctx);
    const values = toSlotValues(plan.meals[0]);

    expect(values).toEqual({
      date: "2026-05-24",
      slotType: "recipe",
      title: "Miso-Glazed Salmon",
      description: "Salmon with bok choy",
      ingredientPreview: ["salmon", "bok choy", "ginger"],
      slotTags: ["Fish", "Asian"],
      estTimeMinutes: 35,
      chips: ["Make it spicier", "Swap protein"],
      servings: 2,
      rationale: "Fresh fish right after the shopping run.",
    });
  });
});

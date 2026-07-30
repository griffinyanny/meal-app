import { describe, it, expect } from "vitest";
import {
  validatePlan,
  validateModification,
  toSlotValues,
  splitChefVoice,
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
    estCostCents: 1600,
    pickedRef: null,
    servings: 2,
    chips: ["Make it spicier", "Swap protein"],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("should return a sorted, date-mapped plan for valid input", () => {
    const plan: AIPlan = {
      chefSummary: "  Built around a busy Thursday.  ",
      chefNote: null,
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
      chefNote: null,
      meals: [meal({ dayOffset: 0 }), meal({ dayOffset: 7 }), meal({ dayOffset: -1 })],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].date).toBe("2026-05-24");
  });

  it("should keep only the first meal when a day is duplicated", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      chefNote: null,
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
      chefNote: null,
      meals: [meal({ dayOffset: 0, title: "  " }), meal({ dayOffset: 1, title: "Real" })],
    };

    const result = validatePlan(plan, ctx);

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].title).toBe("Real");
  });

  it("should keep an eating_out slot without a title and clear its concept fields", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      chefNote: null,
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
      chefNote: null,
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

  // W6 · cost estimation. The guardrail is that an implausible estimate becomes
  // NO estimate rather than a clamped one — the surface can honestly say nothing,
  // and a number the user can check against a receipt has to be earned.
  it.each([
    ["zero", 0],
    ["negative", -500],
    ["absurdly high", 250_00],
    ["fractional cents", 1234.5],
  ])("should drop a %s cost estimate to null rather than clamp it", (_label, estCostCents) => {
    const plan = validatePlan(
      { chefSummary: "A week.", chefNote: null, meals: [meal({ estCostCents })] },
      ctx
    );
    expect(plan.meals[0].estCostCents).toBeNull();
  });

  it("should keep a plausible cost estimate", () => {
    const plan = validatePlan(
      { chefSummary: "A week.", chefNote: null, meals: [meal({ estCostCents: 1850 })] },
      ctx
    );
    expect(plan.meals[0].estCostCents).toBe(1850);
  });

  it("should not carry a cost estimate on a night nobody is cooking", () => {
    const plan = validatePlan(
      {
        chefSummary: "A week.",
        chefNote: null,
        meals: [meal({ slotType: "eating_out", title: null, estCostCents: 4000 })],
      },
      ctx
    );
    expect(plan.meals[0].estCostCents).toBeNull();
  });

  it("should throw when no usable meals remain", () => {
    const plan: AIPlan = {
      chefSummary: "A week.",
      chefNote: null,
      meals: [meal({ dayOffset: 99 })],
    };

    expect(() => validatePlan(plan, ctx)).toThrow();
  });

  it("should throw when the chef summary is empty", () => {
    const plan: AIPlan = { chefSummary: "   ", chefNote: null, meals: [meal()] };

    expect(() => validatePlan(plan, ctx)).toThrow();
  });
});

// BUG-034. The claim is one sentence because CODE says so, not because the
// prompt asks nicely — BUG-033 established that a style clause loses to the
// request competing with it. These tests are the guarantee.
describe("splitChefVoice", () => {
  it("should move a second sentence out of the claim and into the note", () => {
    const result = splitChefVoice(
      "Five dinners, one shop, nothing wasted. Built around the salmon you liked.",
      null
    );

    expect(result.chefSummary).toBe("Five dinners, one shop, nothing wasted.");
    expect(result.chefNote).toBe("Built around the salmon you liked.");
  });

  it("should keep a one-sentence claim whole and leave the note alone", () => {
    const result = splitChefVoice("One shop, nothing wasted.", "The argument.");

    expect(result.chefSummary).toBe("One shop, nothing wasted.");
    expect(result.chefNote).toBe("The argument.");
  });

  it("should put the overflow AHEAD of a note the model also wrote", () => {
    const result = splitChefVoice("A claim. Its own argument.", "And another.");

    expect(result.chefSummary).toBe("A claim.");
    expect(result.chefNote).toBe("Its own argument. And another.");
  });

  it("should split on ? and ! as well as .", () => {
    expect(splitChefVoice("Busy week? Here's the short version.", null)).toEqual({
      chefSummary: "Busy week?",
      chefNote: "Here's the short version.",
    });
    expect(splitChefVoice("Big week! Six nights, one shop.", null)).toEqual({
      chefSummary: "Big week!",
      chefNote: "Six nights, one shop.",
    });
  });

  it("should NEVER truncate — a single long sentence survives intact", () => {
    // The whole point of splitting rather than capping. There is no boundary to
    // split on here, so the claim is long; cutting it would lose the chef's
    // words to protect a layout, which is the failure this fix exists to avoid.
    const long =
      "A week built around one shop, a Sunday that does the work for Monday, " +
      "and two nights short enough to cook after a genuinely long day";

    expect(splitChefVoice(long, null)).toEqual({
      chefSummary: long,
      chefNote: null,
    });
  });

  it("should not split a decimal or an abbreviation mid-sentence", () => {
    // "3.5" and "e.g." carry no whitespace after the point, which is what the
    // boundary test keys on — a naive split on "." would cut both in half.
    const summary = "Nothing over 3.5 hours, e.g. the Sunday braise";

    expect(splitChefVoice(summary, null).chefSummary).toBe(summary);
  });

  it("should treat an empty or whitespace-only note as no note", () => {
    expect(splitChefVoice("One claim.", "   ").chefNote).toBeNull();
  });

  it("should be applied by validatePlan, not just available to it", () => {
    const plan = validatePlan(
      {
        chefSummary: "Five dinners, one shop. I leaned on Sunday for Monday.",
        chefNote: null,
        meals: [meal()],
      },
      ctx
    );

    expect(plan.chefSummary).toBe("Five dinners, one shop.");
    expect(plan.chefNote).toBe("I leaned on Sunday for Monday.");
  });

  it("should let the NOTE satisfy absorption, not only the claim", () => {
    // The regression the split could have caused silently. absorbRepeatedMethod
    // strips a four-plus-title method only when the week already said it — and
    // the split moves most of the saying into chefNote. Reading the claim alone
    // would have turned the strip off for exactly the weeks it exists for.
    const plan = validatePlan(
      {
        chefSummary: "Six nights, one shop.",
        chefNote: "I leaned on the grill all week.",
        meals: [
          meal({ dayOffset: 0, title: "Grilled Lemon Chicken" }),
          meal({ dayOffset: 1, title: "Grilled Citrus Salmon" }),
          meal({ dayOffset: 2, title: "Grilled Pork Tenderloin" }),
          meal({ dayOffset: 3, title: "Grilled Shrimp Skewers" }),
        ],
      },
      ctx
    );

    expect(plan.meals.map((m) => m.title)).toEqual([
      "Lemon Chicken",
      "Citrus Salmon",
      "Pork Tenderloin",
      "Shrimp Skewers",
    ]);
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
    const plan = validatePlan({ chefSummary: "A week.", chefNote: null, meals: [meal()] }, ctx);
    const values = toSlotValues(plan.meals[0]);

    expect(values).toEqual({
      date: "2026-05-24",
      slotType: "recipe",
      title: "Miso-Glazed Salmon",
      description: "Salmon with bok choy",
      ingredientPreview: ["salmon", "bok choy", "ginger"],
      slotTags: ["Fish", "Asian"],
      estTimeMinutes: 35,
      estCostCents: 1600,
      chips: ["Make it spicier", "Swap protein"],
      servings: 2,
      rationale: "Fresh fish right after the shopping run.",
    });
  });
});

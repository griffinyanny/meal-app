import { describe, it, expect } from "vitest";
import {
  dayTitle,
  isPlanElapsed,
  scopedRequest,
  workingLabel,
  type DisplayMeal,
} from "./plan-helpers";

// dayName is ALL-CAPS in production (see WEEKDAYS) — tests must match, or a
// stray toLowerCase() looks correct against title-case fixtures (the exact
// masking that shipped the lowercase "Reworking sunday's dinner…" bug).
function meal(overrides: Partial<DisplayMeal> = {}): DisplayMeal {
  return {
    dayName: "SUNDAY",
    relative: null,
    timeframe: "upcoming",
    slotType: "recipe",
    mealType: "dinner",
    title: "Chicken Tikka",
    description: null,
    rationale: null,
    ingredientPreview: [],
    tags: [],
    estTimeMinutes: null,
    estCostCents: null,
    servings: null,
    chips: [],
    feedback: null,
    recipeId: null,
    recipeStatus: "none",
    pickedRecipeId: null,
    pickedSourceServings: null,
    ...overrides,
  };
}

// Regression guard for the Session 15 meal-scoping bug: a free-form request from
// a meal-scoped chat used to reach the AI with no day/dish anchor ("swap this"),
// so the wrong meal got changed. scopedRequest injects the anchor.
describe("scopedRequest", () => {
  it("should anchor the request to the meal's day and title", () => {
    const result = scopedRequest("swap this for salmon", meal());
    expect(result).toBe("swap this for salmon — for sunday's Chicken Tikka.");
  });

  it("should lowercase the day name so it reads naturally mid-sentence", () => {
    const result = scopedRequest("make it vegetarian", meal({ dayName: "THURSDAY" }));
    expect(result).toContain("for thursday's");
  });

  it("should include the request text and the dish so the AI can resolve 'this'", () => {
    const result = scopedRequest("more protein", meal({ title: "Pad Thai" }));
    expect(result).toContain("more protein");
    expect(result).toContain("Pad Thai");
  });

  it("should fall back to 'dinner' when the meal has no title yet", () => {
    const result = scopedRequest("something lighter", meal({ title: null }));
    expect(result).toBe("something lighter — for sunday's dinner.");
  });
});

// User-facing prose renders the ALL-CAPS eyebrow day as a proper noun.
describe("dayTitle", () => {
  it("should title-case an all-caps day name", () => {
    expect(dayTitle("TUESDAY")).toBe("Tuesday");
    expect(dayTitle("SUNDAY")).toBe("Sunday");
  });
});

// The in-place pending state names the day being changed (always correct)
// rather than parsing the free-text request into a verb.
describe("workingLabel", () => {
  it("should name the day as a proper noun for a scoped modify", () => {
    expect(workingLabel(meal({ dayName: "TUESDAY" }))).toBe(
      "Reworking Tuesday's dinner…"
    );
  });

  it("should stay general when there's no scoped meal (whole-week request)", () => {
    expect(workingLabel(null)).toBe("Reworking your week…");
  });
});

// A plan whose every day is in the past should invite a fresh week instead of
// rendering the nonsensical mid-week "adjust the rest of the week" view.
describe("isPlanElapsed", () => {
  it("should be true when every meal is in the past", () => {
    expect(
      isPlanElapsed([meal({ timeframe: "past" }), meal({ timeframe: "past" })])
    ).toBe(true);
  });

  it("should be false when any meal is tonight or upcoming", () => {
    expect(
      isPlanElapsed([meal({ timeframe: "past" }), meal({ timeframe: "tonight" })])
    ).toBe(false);
    expect(isPlanElapsed([meal({ timeframe: "upcoming" })])).toBe(false);
  });

  it("should be false for an empty plan (nothing to wrap up)", () => {
    expect(isPlanElapsed([])).toBe(false);
  });
});

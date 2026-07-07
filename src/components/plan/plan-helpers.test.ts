import { describe, it, expect } from "vitest";
import { scopedRequest, type DisplayMeal } from "./plan-helpers";

function meal(overrides: Partial<DisplayMeal> = {}): DisplayMeal {
  return {
    dayName: "Sunday",
    relative: null,
    timeframe: "upcoming",
    slotType: "recipe",
    title: "Chicken Tikka",
    description: null,
    rationale: null,
    ingredientPreview: [],
    tags: [],
    estTimeMinutes: null,
    servings: null,
    chips: [],
    feedback: null,
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
    const result = scopedRequest("make it vegetarian", meal({ dayName: "Thursday" }));
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

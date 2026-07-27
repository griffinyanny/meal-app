import { describe, expect, it } from "vitest";
import { describeCaught, type PreferenceSnapshot } from "./caught";

const before: PreferenceSnapshot = {
  dietaryFramework: "omnivore",
  restrictions: [],
  dislikes: [],
  cuisinePreferences: [],
  householdSize: 2,
  maxCookTimeWeeknight: 45,
  maxCookTimeWeekend: 90,
};

describe("describeCaught", () => {
  it("should itemize what the message changed rather than restating it", () => {
    const caught = describeCaught(
      before,
      { dietaryFramework: "pescatarian", cuisinePreferences: ["Thai"] },
      []
    );
    expect(caught).toEqual(["Pescatarian", "Thai"]);
  });

  it("should keep the allergy marker on an avoid", () => {
    const caught = describeCaught(before, { restrictions: ["shellfish (allergy)"] }, []);
    expect(caught).toEqual(["No shellfish (allergy)"]);
  });

  it("should only list what is new, not the whole array", () => {
    const caught = describeCaught(
      { ...before, cuisinePreferences: ["Thai"] },
      { cuisinePreferences: ["Thai", "Korean"] },
      []
    );
    expect(caught).toEqual(["Korean"]);
  });

  it("should label the scalar fields the way the interview asks about them", () => {
    const caught = describeCaught(
      before,
      { maxCookTimeWeeknight: 30, householdSize: 4 },
      []
    );
    expect(caught).toContain("Under 30 min");
    expect(caught).toContain("4 servings");
  });

  it("should carry free-form memories through as their own items", () => {
    const caught = describeCaught(before, {}, ["We do Taco Tuesday"]);
    expect(caught).toEqual(["We do Taco Tuesday"]);
  });

  it("should return nothing when the message changed nothing", () => {
    expect(describeCaught(before, {}, [])).toEqual([]);
  });
});

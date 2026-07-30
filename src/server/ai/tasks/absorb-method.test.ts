import { describe, it, expect } from "vitest";
import { absorbRepeatedMethod } from "./absorb-method";

// The real round-2 Layer B output for "I want to grill" — seven of seven, with
// W1's absorption rule already in the system prompt. This fixture IS the bug.
const GRILL_WEEK = [
  { title: "Grilled Lemon-Herb Chicken Thighs with Charred Green Beans" },
  { title: "Grilled Citrus Salmon with Avocado Salsa" },
  { title: "Grilled Portobello Mushroom Burgers with Dill Yogurt Sauce" },
  { title: "Grilled Pork Tenderloin with Roasted Baby Potatoes" },
  { title: "Grilled Shrimp Skewers with Mango-Pineapple Salsa" },
  { title: "Grilled Vegetable Platter with Lemon-Dill Vinaigrette" },
  { title: "Grilled Steak Salad with Warm Bacon Dressing" },
];
const GRILL_SUMMARY =
  "A week built around the grill, leaning on smoke and char.";

describe("absorbRepeatedMethod", () => {
  it("should drop a method that opens the whole week", () => {
    const out = absorbRepeatedMethod(GRILL_WEEK, GRILL_SUMMARY);

    expect(out.map((m) => m.title)).toEqual([
      "Lemon-Herb Chicken Thighs with Charred Green Beans",
      "Citrus Salmon with Avocado Salsa",
      "Portobello Mushroom Burgers with Dill Yogurt Sauce",
      "Pork Tenderloin with Roasted Baby Potatoes",
      "Shrimp Skewers with Mango-Pineapple Salsa",
      "Vegetable Platter with Lemon-Dill Vinaigrette",
      "Steak Salad with Warm Bacon Dressing",
    ]);
  });

  it("should leave a method that covers only three meals", () => {
    // Three is a coincidence, four is a theme. Below the threshold the titles
    // are just describing themselves and stripping would lose real information.
    const meals = [
      { title: "Grilled Chicken Thighs" },
      { title: "Grilled Salmon" },
      { title: "Grilled Steak Salad" },
      { title: "Lentil Soup" },
    ];

    expect(absorbRepeatedMethod(meals, GRILL_SUMMARY)).toEqual(meals);
  });

  it("should not strip when the summary never says the method", () => {
    // Absorption is a PRECONDITION for dropping. If the week hasn't stated it,
    // removing it from the cards deletes the only place the person could read
    // it — which is worse than a repetitive rail.
    const summary = "Seven quick dinners that lean on fresh produce.";

    expect(absorbRepeatedMethod(GRILL_WEEK, summary)).toEqual(GRILL_WEEK);
  });

  it("should never rename a dish whose name contains the method", () => {
    // "Grilled Cheese" is the food, not a technique applied to cheese.
    const meals = [
      { title: "Grilled Cheese with Tomato Soup" },
      { title: "Grilled Chicken Thighs" },
      { title: "Grilled Salmon" },
      { title: "Grilled Steak Salad" },
      { title: "Grilled Shrimp Skewers" },
    ];

    const out = absorbRepeatedMethod(meals, GRILL_SUMMARY);

    expect(out[0].title).toBe("Grilled Cheese with Tomato Soup");
    expect(out[1].title).toBe("Chicken Thighs");
  });

  it("should ignore a method that appears mid-title", () => {
    // "with Roasted Carrots" is not a title opening with a method, and a rail
    // of them reads fine — the rule is about the first word you scan.
    const meals = [
      { title: "Chicken Thighs with Roasted Carrots" },
      { title: "Cod with Roasted Fennel" },
      { title: "Pork with Roasted Apples" },
      { title: "Lentils with Roasted Squash" },
    ];

    expect(absorbRepeatedMethod(meals, "A roasted-vegetable week.")).toEqual(
      meals
    );
  });

  it("should preserve every other field on the meal", () => {
    const meals = GRILL_WEEK.map((m, i) => ({ ...m, estCostCents: 900 + i }));

    const out = absorbRepeatedMethod(meals, GRILL_SUMMARY);

    expect(out[0].estCostCents).toBe(900);
    expect(out[6].estCostCents).toBe(906);
  });
});

import { describe, it, expect } from "vitest";
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  deriveHouseholdSize,
  describeHousehold,
  householdCookingNotes,
  householdCompositionSchema,
  type HouseholdComposition,
} from "./household";

function composition(patch: Partial<HouseholdComposition> = {}): HouseholdComposition {
  return { ...DEFAULT_HOUSEHOLD_COMPOSITION, ...patch };
}

describe("deriveHouseholdSize", () => {
  it("should count adults and children as full servings", () => {
    expect(deriveHouseholdSize(composition({ adults: 2, children: 3 }))).toBe(5);
  });

  it("should not count a baby under 6 months, who is not eating solids at all", () => {
    expect(
      deriveHouseholdSize(composition({ adults: 2, babies: 1, babyStage: "under_6m" }))
    ).toBe(2);
  });

  it("should not count a 6 to 12 month old, who eats adapted bites rather than a portion", () => {
    expect(
      deriveHouseholdSize(composition({ adults: 2, babies: 1, babyStage: "6_to_12m" }))
    ).toBe(2);
  });

  it("should count a 12 to 24 month old, who eats the family meal", () => {
    expect(
      deriveHouseholdSize(composition({ adults: 2, babies: 1, babyStage: "12_to_24m" }))
    ).toBe(3);
  });

  it("should not count babies when the stage was never captured", () => {
    expect(
      deriveHouseholdSize(composition({ adults: 2, babies: 1, babyStage: null }))
    ).toBe(2);
  });

  it("should preserve Griffin's household (2 adults + a baby) at the pre-existing default of 2", () => {
    expect(
      deriveHouseholdSize(composition({ adults: 2, babies: 1, babyStage: "6_to_12m" }))
    ).toBe(2);
  });

  it("should clamp to the 1 to 20 range the preferences schema validates", () => {
    expect(deriveHouseholdSize(composition({ adults: 20, children: 20 }))).toBe(20);
    expect(deriveHouseholdSize(composition({ adults: 1 }))).toBe(1);
  });
});

describe("describeHousehold", () => {
  it("should return null for an adults-only household, where the servings line already says everything", () => {
    expect(describeHousehold(composition({ adults: 2 }))).toBeNull();
  });

  it("should join two groups with 'and'", () => {
    expect(describeHousehold(composition({ adults: 2, children: 1 }))).toBe(
      "2 adults and 1 child"
    );
  });

  it("should serial-join three groups", () => {
    expect(
      describeHousehold(composition({ adults: 2, children: 2, babies: 1 }))
    ).toBe("2 adults, 2 children, and 1 baby");
  });

  it("should singularize a one-adult household", () => {
    expect(describeHousehold(composition({ adults: 1, children: 1 }))).toBe(
      "1 adult and 1 child"
    );
  });
});

describe("householdCookingNotes", () => {
  it("should return no notes for an adults-only household", () => {
    expect(householdCookingNotes(composition({ adults: 2 }))).toEqual([]);
  });

  it("should tell the chef to keep heat on the side when there are children", () => {
    const notes = householdCookingNotes(composition({ children: 2 }));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("kid-friendly");
  });

  it("should tell the chef to plan normally for a milk-only baby", () => {
    const notes = householdCookingNotes(
      composition({ babies: 1, babyStage: "under_6m" })
    );
    expect(notes[0]).toContain("not on solids yet");
  });

  it("should call out choking hazards for a baby starting solids", () => {
    const notes = householdCookingNotes(
      composition({ babies: 1, babyStage: "6_to_12m" })
    );
    expect(notes[0]).toContain("no honey");
    expect(notes[0]).toContain("whole grapes");
  });

  it("should describe a smaller share of the family meal for a toddler", () => {
    const notes = householdCookingNotes(
      composition({ babies: 1, babyStage: "12_to_24m" })
    );
    expect(notes[0]).toContain("smaller portion");
    expect(notes[0]).toContain("whole nuts");
  });

  it("should fall back to the safest first-foods guidance when the stage is unknown", () => {
    const notes = householdCookingNotes(composition({ babies: 1, babyStage: null }));
    expect(notes[0]).toContain("starting solids");
  });
});

describe("householdCompositionSchema", () => {
  it("should reject a household with no adults", () => {
    expect(
      householdCompositionSchema.safeParse({ adults: 0, children: 2, babies: 0 }).success
    ).toBe(false);
  });

  it("should reject a total household larger than the servings domain allows", () => {
    expect(
      householdCompositionSchema.safeParse({ adults: 15, children: 10, babies: 0 })
        .success
    ).toBe(false);
  });

  it("should accept a composition with no baby stage", () => {
    expect(
      householdCompositionSchema.safeParse({ adults: 2, children: 0, babies: 0 }).success
    ).toBe(true);
  });

  it("should reject an unknown baby stage", () => {
    expect(
      householdCompositionSchema.safeParse({
        adults: 2,
        children: 0,
        babies: 1,
        babyStage: "toddler",
      }).success
    ).toBe(false);
  });
});

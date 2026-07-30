import { describe, it, expect } from "vitest";
import {
  buildPicksBlock,
  dedupePickedRefs,
  resolvePickedRecipeId,
  type PickInput,
} from "./plan-picks";
import type { ValidatedMeal } from "./plan-types";

const CARBONARA: PickInput = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Spaghetti alla Carbonara",
  servings: 4,
  totalTimeMinutes: 40,
};

const LAMB: PickInput = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Lamb Shoulder with Anchovy",
  servings: 6,
  totalTimeMinutes: 180,
};

function meal(overrides: Partial<ValidatedMeal> = {}): ValidatedMeal {
  return {
    date: "2026-05-24",
    slotType: "recipe",
    title: "Dinner",
    description: null,
    rationale: null,
    ingredientPreview: [],
    tags: [],
    estTimeMinutes: null,
    estCostCents: null,
    servings: 2,
    chips: [],
    pickedRef: null,
    ...overrides,
  };
}

describe("buildPicksBlock", () => {
  it("should return null when nothing was picked, so the prompt gains no empty section", () => {
    expect(buildPicksBlock([], 2)).toBeNull();
  });

  it("should number the picks so the model answers with a ref, never an id", () => {
    const block = buildPicksBlock([CARBONARA, LAMB], 2)!;

    expect(block).toContain("[1] Spaghetti alla Carbonara");
    expect(block).toContain("[2] Lamb Shoulder with Anchovy");
    // The ID-SAFETY CLAIM, asserted rather than assumed: a uuid the model never
    // sees is a uuid it cannot hallucinate back at us.
    expect(block).not.toContain(CARBONARA.id);
    expect(block).not.toContain(LAMB.id);
  });

  it("should carry the recipe's own time and servings, which is what scaling is measured against", () => {
    const block = buildPicksBlock([CARBONARA], 3)!;

    expect(block).toContain("40 min");
    expect(block).toContain("the recipe serves 4");
    expect(block).toContain("You are cooking for 3");
  });

  it("should say a long cook the way a cook says it, not in raw minutes", () => {
    // The model writes rationales in the vocabulary it is handed. Give it
    // "180 min" and "a 180-minute braise" turns up on a card the rest of the
    // surface renders as "3 hr" — the BUG-031 shape, where internal vocabulary
    // reached a user-facing string because the prompt supplied it.
    const block = buildPicksBlock([LAMB], 2)!;

    expect(block).toContain("3 hr");
    expect(block).not.toContain("180 min");
  });

  it("should tell the chef to choose the night when nobody named one", () => {
    // The ledger's load-bearing sentence: a pick is a CONSTRAINT, not a schedule.
    const block = buildPicksBlock([CARBONARA], 2)!;

    expect(block).toContain("YOU choose which night");
    expect(block).toContain("Do not rewrite, rename, substitute");
  });

  it("should stand down on the night when the person already chose it", () => {
    // `3e`. The chef keeps the rest of the week and keeps the no-rewrite rule;
    // it just stops re-deciding the one night the person pointed at.
    const block = buildPicksBlock([CARBONARA], 2, true)!;

    expect(block).toContain("The night is already chosen");
    expect(block).not.toContain("YOU choose which night");
    expect(block).toContain("Do not rewrite, rename, substitute");
    // The rationale rule survives either way — placement, never the dish.
    expect(block).toContain("argues the PLACEMENT");
  });

  it("should omit the scaling instruction when the household size is unknown", () => {
    // Better to say nothing than to ask the chef to scale to a number we do not
    // have — it would scale to a guess and then announce the guess out loud.
    const block = buildPicksBlock([CARBONARA], undefined)!;

    expect(block).not.toContain("You are cooking for");
    expect(block).toContain("[1] Spaghetti alla Carbonara");
  });

  it("should read singular for one pick and plural for several", () => {
    expect(buildPicksBlock([CARBONARA], 2)!).toContain("this recipe");
    expect(buildPicksBlock([CARBONARA, LAMB], 2)!).toContain("these recipes");
  });

  // §B: "the boundary is STATED, not enforced silently."
  //
  // The instruction used to say "in your summary", and the pick path has no
  // field called summary — it returns `chefResponse`. So the chef dropped the
  // sentence entirely, which is what S47's Layer B found on BOTH invocations.
  // A rule aimed at a field that does not exist is not a rule; it is BUG-033
  // wearing the opposite face, and the only way to keep it honest is to name
  // the fields that actually exist on each path.
  it("should point the boundary sentence at fields that actually exist", () => {
    const block = buildPicksBlock([CARBONARA], 2)!;

    expect(block).toContain("it is their recipe, so you will not rewrite it");
    expect(block).toContain("chefResponse");
    expect(block).toContain("chefNote");
    // The old wording, which named nothing the modify schema returns.
    expect(block).not.toContain("in your summary");
  });
});

describe("resolvePickedRecipeId", () => {
  it("should map a live 1-based ref to its recipe", () => {
    expect(resolvePickedRecipeId(1, [CARBONARA, LAMB])).toBe(CARBONARA.id);
    expect(resolvePickedRecipeId(2, [CARBONARA, LAMB])).toBe(LAMB.id);
  });

  it("should return null for a ref past the end, which is what a hallucination looks like", () => {
    expect(resolvePickedRecipeId(3, [CARBONARA, LAMB])).toBeNull();
    expect(resolvePickedRecipeId(99, [CARBONARA])).toBeNull();
  });

  it("should return null for zero and negatives rather than wrapping to the last item", () => {
    expect(resolvePickedRecipeId(0, [CARBONARA])).toBeNull();
    expect(resolvePickedRecipeId(-1, [CARBONARA])).toBeNull();
  });

  it("should return null for a ref on a generation that had no picks at all", () => {
    expect(resolvePickedRecipeId(1, [])).toBeNull();
  });

  it("should return null for a non-integer", () => {
    expect(resolvePickedRecipeId(1.5, [CARBONARA])).toBeNull();
  });

  it("should return null when the model said nothing", () => {
    expect(resolvePickedRecipeId(null, [CARBONARA])).toBeNull();
  });
});

describe("dedupePickedRefs", () => {
  it("should keep the first claim on a ref and strip the second", () => {
    // Two slots pointing at one library recipe would shop for it twice and put
    // PICKED on a night the person never chose.
    const result = dedupePickedRefs([
      meal({ date: "2026-05-24", pickedRef: 1 }),
      meal({ date: "2026-05-25", pickedRef: 1 }),
    ]);

    expect(result[0].pickedRef).toBe(1);
    expect(result[1].pickedRef).toBeNull();
  });

  it("should leave the duplicate's meal intact — it loses provenance, not dinner", () => {
    const result = dedupePickedRefs([
      meal({ date: "2026-05-24", title: "Carbonara", pickedRef: 1 }),
      meal({ date: "2026-05-25", title: "Carbonara Again", pickedRef: 1 }),
    ]);

    expect(result[1].title).toBe("Carbonara Again");
    expect(result[1].slotType).toBe("recipe");
  });

  it("should leave distinct refs alone", () => {
    const result = dedupePickedRefs([
      meal({ date: "2026-05-24", pickedRef: 1 }),
      meal({ date: "2026-05-25", pickedRef: 2 }),
    ]);

    expect(result.map((m) => m.pickedRef)).toEqual([1, 2]);
  });

  it("should pass through a week with no picks unchanged", () => {
    const meals = [meal(), meal({ date: "2026-05-25" })];

    expect(dedupePickedRefs(meals).every((m) => m.pickedRef === null)).toBe(true);
  });
});

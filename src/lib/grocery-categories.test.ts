import { describe, it, expect } from "vitest";
import { guessCategory } from "./grocery-categories";

describe("guessCategory", () => {
  // BUG-001: substring matching sent compound words to the wrong aisle for the ~1s
  // before the AI tidy landed. Whole-word matching fixes the misfires.
  it("does not send compound words to a keyword's aisle (BUG-001)", () => {
    expect(guessCategory("watermelon")).toBe("produce"); // not beverages (via "water")
    expect(guessCategory("butternut squash")).toBe("produce"); // not dairy (via "butter")
    expect(guessCategory("eggplant")).toBe("produce"); // not dairy (via "egg")
  });

  it("still classifies the plain items each keyword is for", () => {
    expect(guessCategory("water")).toBe("beverages");
    expect(guessCategory("butter")).toBe("dairy");
    expect(guessCategory("eggs")).toBe("dairy"); // simple plural still matches
    expect(guessCategory("chicken breast")).toBe("meat");
    expect(guessCategory("ground beef")).toBe("meat");
    expect(guessCategory("olive oil")).toBe("spices");
    expect(guessCategory("greek yogurt")).toBe("dairy");
  });

  it("keeps the intentional 'berr' stem working mid-word", () => {
    expect(guessCategory("blueberries")).toBe("produce"); // "berr" stem, mid-word
    expect(guessCategory("strawberry")).toBe("produce");
    // "ice cream" lands on dairy, not frozen — "cream" (dairy) is listed before the
    // frozen "ice cream" phrase and wins. Pre-existing keyword-ordering quirk (the
    // old substring code did the same); the AI tidy re-homes it within ~1s.
    expect(guessCategory("ice cream")).toBe("dairy");
  });

  it("prefers the earlier-listed aisle when a word matches more than one", () => {
    expect(guessCategory("bell pepper")).toBe("produce"); // produce before spices
  });

  it("falls back to 'other' when nothing matches", () => {
    expect(guessCategory("quinoa")).toBe("other");
    expect(guessCategory("")).toBe("other");
  });
});

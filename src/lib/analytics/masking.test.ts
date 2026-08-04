import { describe, it, expect } from "vitest";
import {
  UNMASK_ATTR,
  maskContent,
  maskTextFn,
  shouldUnmask,
  type MaskableElement,
} from "./masking";

/** Minimal stand-in for an element tree. See `MaskableElement`'s note. */
function el(
  attrs: string[] = [],
  parent: MaskableElement | null = null
): MaskableElement {
  return {
    hasAttribute: (name: string) => attrs.includes(name),
    parentElement: parent,
  };
}

describe("session-replay masking policy", () => {
  // ⚠️ Asserted by PROPERTY, not by a transcribed literal. The first draft of
  // this test hand-typed the bullet run and got it wrong (Spaghetti is nine
  // characters, not ten) — the test went red against correct code, which is
  // the failure mode S59 names: a guard pointing at working code teaches you
  // to edit the expectation. The properties below are what the function
  // actually promises.
  it("masks by default — an element with no marker anywhere above it", () => {
    const title = "Spaghetti alla Carbonara";
    const masked = maskTextFn(title, el());

    expect(masked).not.toContain("Spaghetti");
    expect(masked).toMatch(/^[•\s]+$/);
    expect(masked).toHaveLength(title.length);
  });

  // ⚠️ Both absent shapes, because the two vendors disagree: rrweb types the
  // element `HTMLElement | null`, posthog-js types it `HTMLElement |
  // undefined`. An unknown element must mask — it is the case where we know
  // least about what the text is.
  it("masks when the element is null or undefined", () => {
    expect(maskTextFn("2 cups chicken broth", null)).toBe("• •••• ••••••• •••••");
    expect(maskTextFn("2 cups chicken broth", undefined)).toBe(
      "• •••• ••••••• •••••"
    );
    expect(maskTextFn("2 cups chicken broth")).toBe("• •••• ••••••• •••••");
  });

  it("unmasks an element carrying the marker", () => {
    expect(maskTextFn("Groceries", el([UNMASK_ATTR]))).toBe("Groceries");
  });

  it("unmasks the whole subtree beneath a marked container", () => {
    const nav = el([UNMASK_ATTR]);
    const label = el([], el([], nav));
    expect(shouldUnmask(label)).toBe(true);
    expect(maskTextFn("Plan", label)).toBe("Plan");
  });

  it("does NOT unmask a sibling subtree", () => {
    const root = el();
    const marked = el([UNMASK_ATTR], root);
    const unmarked = el([], root);
    expect(shouldUnmask(marked)).toBe(true);
    expect(shouldUnmask(unmarked)).toBe(false);
  });

  // ⚠️ THE TRAP, written down because it is the reason the allow-list is
  // structural-by-marker rather than structural-by-tag.
  //
  // The obvious reading of "unmask the chrome — nav, buttons, state labels" is
  // a selector like `nav, button`. `grocery-row.tsx` renders the item name as a
  // display `<button>` at rest (the `<input>` only appears while editing), so
  // "unmask all buttons" would record THE ENTIRE GROCERY LIST in the clear —
  // the single largest piece of household content in the product, on the
  // surface used most often, via a rule that reads as obviously safe.
  it("keeps a content-bearing button masked (the grocery-row trap)", () => {
    const groceryRowButton = el(); // a <button> — but it holds an item name
    expect(maskTextFn("6 cloves garlic", groceryRowButton)).toBe(
      "• •••••• ••••••"
    );
  });

  it("preserves length and word boundaries so replay layout stays honest", () => {
    const masked = maskContent("Roast chicken with fennel");
    expect(masked).toHaveLength("Roast chicken with fennel".length);
    expect(masked.split(" ")).toHaveLength(4);
    expect(masked).not.toMatch(/[a-z]/i);
  });

  it("leaves no digits behind — ages, quantities and counts are content too", () => {
    expect(maskContent("Norah is 2")).toBe("••••• •• •");
    expect(maskContent("$94.00")).toBe("••••••");
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A source-level guard for spec §09 (1F/B7): "one way to talk to the chef."
//
// The item exists because the build had FOUR answers to "let the user say
// something in their own words" — and measuring it in S56 found SIX, because
// §09's list was written in S39 and 1E.5 rebuilt Plan after it. Nothing failed
// on any of them. A hand-rolled input renders, looks deliberate, and survives
// every DOM assertion in the suite; the count only ever went up.
//
// So the property worth defending is not "the six sites are correct today", it
// is "the seventh cannot be written by accident" — B3's finding one primitive
// over, where every rung of `ui/button`'s icon variants sat under the 44px
// floor and so the next `size="icon"` was wrong by default.
//
// ALLOW-LIST, not a block-list (palette.test.ts's precedent): whether a given
// `<input>` is a freeform chef control or something else cannot be answered
// from the string, so enumerating the survivors is the only form that fails
// closed on a new one.

const SRC = join(__dirname, "..", "..");
// This file quotes the markup it forbids, so it is the one file the walk skips.
const SELF = join(__dirname, "freeform-field.test.ts");
// The control itself, which is the one place the markup is allowed to exist.
const CONTROL = join(__dirname, "freeform-field.tsx");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx$/.test(e.name) && p !== SELF && p !== CONTROL ? [p] : [];
  });
}

function hits(pattern: RegExp): string[] {
  return walk(SRC).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => pattern.test(line))
      .map(({ n }) => `${file.slice(SRC.length + 1)}:${n}`)
  );
}

describe("spec §09 — one freeform control", () => {
  it("should leave no hand-rolled <textarea> anywhere but the §09 control", () => {
    // `ui/textarea.tsx` was deleted with this item rather than left in place.
    // An unused primitive is not neutral: it is the rung the next call site
    // reaches for, which is exactly how six of these got written.
    expect(
      hits(/<textarea/i),
      "Use `<FreeformField>` from components/shared/freeform-field.tsx. Offenders: "
    ).toEqual([]);
  });

  it("should confine raw text inputs to the controls that are NOT §09", () => {
    // §09 draws its own boundary and this list is that boundary, not a
    // convenience: "Search is not this control. Searching is not talking — it
    // stays in header pattern B, with a muted magnifier leading."
    //
    // Every survivor is here for a stated reason. A new entry means someone has
    // decided a new control is not chef talk, which is a decision worth making
    // out loud rather than by writing an <input>.
    expect(hits(/<input/i)).toEqual([
      // In-place edit of a row that already exists. Renaming "2 lemons" is not
      // telling the chef something; it is correcting a field.
      "components/groceries/grocery-row.tsx:122",
      "components/groceries/grocery-row.tsx:176",
      // Header pattern B — search, explicitly excluded by §09.
      "components/plan/picker/picker-content.tsx:221",
      // A URL, not a sentence. Nothing is being said to anyone.
      "components/recipes/import-recipe-dialog.tsx:49",
      "components/recipes/recipe-header.tsx:41",
      // The shadcn primitive the URL field is built from. It survives because
      // that field does; `ui/textarea.tsx` did not, and was deleted with B7.
      "components/ui/input.tsx:8",
      // Adds ONE constraint word to a card ("Add a dislike"). §09's control is
      // for a sentence in your own words; this is a chip factory.
      "components/you/chip-adder.tsx:37",
    ]);
  });

  it("should route every freeform chef field through the one control", () => {
    // The six sites, named. Onboarding was pass 1 (S39); the other five landed
    // in S56. Listed rather than counted, because "how many import it" passes
    // just as happily when one of them has quietly stopped.
    const importers = walk(SRC)
      .filter((f) => /FreeformField/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(SRC.length + 1))
      .sort();

    expect(importers).toEqual([
      "components/groceries/add-item-row.tsx",
      "components/onboarding/tell-me-field.tsx",
      "components/plan/no-plan-state.tsx",
      "components/recipes/generate-recipe-dialog.tsx",
      "components/recipes/recipe-detail.tsx",
      "components/shared/talk-to-chef-sheet.tsx",
    ]);
  });

  it("should keep both doors open at rest — never mic-only, never text-only", () => {
    // §09's own words: "Send appears to the right of the mic; the mic does not
    // move or disappear. Nothing about starting to type should close the other
    // door." The Groceries quick-add used to break exactly this, swapping its
    // chef launcher for a send button the moment you typed.
    const control = readFileSync(CONTROL, "utf8");
    // The mic is rendered unconditionally; only the SEND slot is allowed a
    // ternary (the submitting label).
    const micBlock = control.slice(
      control.indexOf('aria-label="Answer by voice"') - 400,
      control.indexOf('aria-label="Answer by voice"')
    );
    expect(micBlock, "the mic must not be conditionally rendered").not.toMatch(/\?\s*\(/);
  });
});

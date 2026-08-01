import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A source-level guard for the two caps rungs spec §05 names (1F/B8a).
//
// Neither rung existed as a class, and that is the whole reason this item was
// ~47 sites across TWELVE size/weight/tracking combinations: every caps label
// in the app was improvised from scratch, because there was nothing to reach
// for. B3 found the same condition in `ui/button.tsx` (every icon rung under
// the 44px floor, so the next `size="icon"` was wrong by default) and B7 found
// it in `ui/textarea.tsx` (an unused primitive is the rung the next call site
// reaches for). An unnamed rung is not neutral — it is a defect generator.
//
// So naming `.spec-eyebrow` and `.spec-label` is only half the fix. Without
// this file the next caps label gets hand-typed at a thirteenth combination and
// nothing goes red: type scatter renders fine, looks deliberate, and survives
// every DOM assertion in the suite. Same argument as `palette.test.ts`.
//
// This is an ALLOW-LIST, not a block-list. "Is this positive tracking a caps
// label or something else" cannot be answered from the string, so the survivors
// are enumerated with a reason and anything new fails closed.

const SRC = join(__dirname, "..");
// This file quotes the class strings it forbids, so it must skip itself —
// `palette.test.ts` learned that the honest way, by failing against itself.
const SELF = join(__dirname, "caps-rungs.test.ts");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) && p !== SELF ? [p] : [];
  });
}

function hits(pattern: RegExp): string[] {
  // Sorted, because `readdirSync` order is the filesystem's and a guard that
  // fails on directory ordering teaches people to edit the expectation.
  return walk(SRC)
    .flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => pattern.test(line))
        .map(({ n }) => `${file.slice(SRC.length + 1)}:${n}`)
    )
    .sort();
}

// Positive letter-spacing is what makes a caps label a caps label — the spec's
// own rule is "tracking is a function of size: negative above 19px, zero from
// 12.5–15.5, positive below 11." So a positive tracking value outside the two
// rungs is either a caps label that skipped them, or a type site that has no
// business carrying tracking at all. Both are findings.
const POSITIVE_TRACKING = /tracking-(\[\s*0?\.?\d|wide\b|wider\b|widest\b)/;

// The survivors, each with the reason it is NOT one of the two caps rungs.
// ⚠️ Every one of these is off the §05 type ladder in some OTHER way and is
// tracked as 1F/B8b (the ~250-site type-scale item). They are listed here so
// this guard fails closed today, not because they are correct.
const ALLOWED = [
  // The "Plan draft" marker is a CHIP, governed by §08 and by §06's Dinner-vs-
  // Swap rule, not by the caps rungs — §05 says a Label never gets a pill, and
  // this one has a fill and a line because §12 item 03 asked for exactly that.
  // Its 10px/600/tracking-wider type is still off the ladder → B8b.
  "components/recipes/recipe-card.tsx:59",
  // A transient sentence-case status inside the §09 control ("Sending…"), not a
  // caps label. Its 0.5px tracking is off the ladder → B8b.
  "components/shared/freeform-field.tsx:142",
  // A sentence-case card title at 0.8rem/700 carrying 0.2px. Off the ladder in
  // size AND tracking, and it is a title rather than a label → B8b.
  "components/you/safety-constraints-card.tsx:29",
  // ⚠️ The classification error worth keeping, because it is the one the rule
  // is designed to prevent. This slot holds "You told me when we started" — a
  // provenance SENTENCE. Both caps rungs are uppercase by definition, so
  // routing it to `.spec-label` shouted an attribution across every memory
  // card. A provenance line is a fact about the card, not the name of a field
  // inside it: that is the Meta rung's job, and Meta is B8b. "Which rung does
  // this take" has a third answer — NEITHER — and the only way to see it is to
  // read what the slot actually holds rather than what its type looks like.
  "components/you/memory-card.tsx:49",
].sort();

describe("caps rungs (spec §05)", () => {
  it("should route every caps label through .spec-eyebrow or .spec-label", () => {
    expect(
      hits(POSITIVE_TRACKING),
      "Spec §05 states exactly TWO caps rungs and both are classes now. Which " +
        "one a label takes is a question about WHAT IT NAMES, never about its " +
        "size today: `.spec-eyebrow` names a shelf of content and stands alone " +
        "above it; `.spec-label` names a field or a slot inside a card. If a " +
        "site is genuinely neither, add it to ALLOWED with the reason. " +
        "Offenders: "
    ).toEqual(ALLOWED);
  });

  it("should keep both rungs reachable — a named rung with no call sites is B4's dead class", () => {
    // B4 added `.spec-group-title` and routed nothing to it, so the rung existed
    // and still nobody could reach for it. That is the failure this whole item
    // is about, so the guard asserts adoption rather than mere existence.
    expect(hits(/\bspec-eyebrow\b/).length).toBeGreaterThan(0);
    expect(hits(/\bspec-label\b/).length).toBeGreaterThan(0);
    expect(hits(/\bspec-group-title\b/).length).toBeGreaterThan(0);
  });

  it("should not let a caps rung be hand-retyped beside the class", () => {
    // The two rungs' exact metrics, typed out. If these reappear as utilities
    // the class has been forked rather than used, which is how twelve
    // combinations happened in the first place.
    expect(hits(/text-\[11px\][^"]*tracking-\[2px\]/)).toEqual([]);
    expect(hits(/text-\[10\.5px\][^"]*tracking-\[1\.3px\]/)).toEqual([]);
  });
});

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
// This was an ALLOW-LIST of four survivors while B8a shipped, because "is this
// positive tracking a caps label or something else" cannot be answered from the
// string. ⚠️ B8b closed all four and the list is DELETED rather than emptied —
// BUG-045's precedent in `palette.test.ts`, where an emptied exception is still
// an invitation. Three took `.spec-label` after all (the tracking was the only
// thing that had made them look like something else) and the memory-card
// provenance took `.spec-meta`, which is the answer B8a wrote down and could
// not act on until the Meta rung existed as a class.

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

describe("caps rungs (spec §05)", () => {
  it("should route every caps label through .spec-eyebrow or .spec-label", () => {
    expect(
      hits(POSITIVE_TRACKING),
      "Spec §05 states exactly TWO caps rungs and both are classes. Which one " +
        "a label takes is a question about WHAT IT NAMES, never about its size " +
        "today: `.spec-eyebrow` names a shelf of content and stands alone " +
        "above it; `.spec-label` names a field or a slot inside a card. If a " +
        "site is genuinely neither, it is Meta — read what the slot HOLDS. " +
        "Offenders: "
    ).toEqual([]);
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

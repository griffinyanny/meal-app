import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A source-level guard for the 1F/B design-system pass (spec §12 item 03 + the
// two semantic calls of B5).
//
// A retired colour does not fail anything. It renders, it looks deliberate, and
// it survives every unit test and every DOM assertion in the suite — the exact
// shape of the `.glass-card` blur bug that shipped for a whole phase before
// globals.test.ts went in. The only layer that catches a stale hex is a layer
// that reads the source, so this is that layer.
//
// It is an ALLOW-LIST, not a block-list, for the amber: the question "is this
// hex a merge marker or something else" cannot be answered from the string, so
// enumerating the survivors is the only form that fails closed on a new one.

const SRC = join(__dirname, "..");
// This file names every literal it forbids, in its own comments and assertions,
// so it is the one file the walk must skip. Found the honest way: the first run
// failed all three cases against itself.
const SELF = join(__dirname, "palette.test.ts");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) && p !== SELF ? [p] : [];
  });
}

function hits(hex: RegExp): string[] {
  return walk(SRC).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => hex.test(line))
      .map(({ n }) => `${file.slice(SRC.length + 1)}:${n}`)
  );
}

describe("retired palette literals", () => {
  it("should have no iOS green #30D158 left — the success hue is --spec-success", () => {
    // Cool green on a warm floor is law 04's exact complaint wearing a semantic
    // label. Four sites, nine literals, across Recipes and Groceries.
    expect(
      hits(/#30D158/i),
      "Use `.spec-success-soft` for the fill+line and `text-[var(--spec-success)]` " +
        "for the glyph or the chip's own type. Offenders: "
    ).toEqual([]);
  });

  it("should have no indigo left — there is no third accent (spec §01)", () => {
    // #3A86FF was --primary until 1E.7 aliased it to the cream action; #5E5CE6
    // is the explorations-background indigo the spec's item 03 also names.
    expect(hits(/#3A86FF|#5E5CE6|rgba\(\s*94,\s*92,\s*230/i)).toEqual([]);
  });

  it("should have no amber left — there is no caution hue (spec §01)", () => {
    // Amber is the chef (§01), so it may never mark a mechanical fact about the
    // list. The merge marker was the reason this rule got written; it became a
    // neutral inset carrying the count as type (Griffin's call, 1F/B5), and the
    // quick-add dedupe notice — the one allow-listed survivor, tracked as
    // BUG-045 — went to flat meta type in 1F/B8a.
    //
    // ⚠️ The allow-list is GONE, not emptied. That was the point of listing the
    // exact file:line rather than excluding the file: closing the bug reddened
    // this test until the exception was deleted with it, so a fixed bug could
    // not leave a stale permission behind (S52).
    expect(hits(/#FF9F0A/i)).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

// A source-level guard for a failure that is invisible in every other layer.
//
// Three of the five blurred surfaces hand-wrote `-webkit-backdrop-filter` next
// to the standard property. lightningcss collapses that duplicate onto the
// PREFIXED form and drops the standard one, so the built CSS shipped
// `.glass-card`, `.glass-surface` and `.glass-sheet` with a prefix Chrome and
// Android stopped honouring years ago — no blur at all, on most of the app's
// cards, since 1E.7.
//
// Nothing caught it: the fill alpha makes a flat card look deliberate, unit
// tests do not read CSS, and the two classes that were CORRECT (`.spec-chrome`,
// `.spec-floating`) are the two that never wrote the prefix by hand. It took
// reading the compiled stylesheet. This test is the cheap version of that.
describe("globals.css", () => {
  it("should never hand-write a -webkit-backdrop-filter prefix", () => {
    const offenders = css
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => line.startsWith("-webkit-backdrop-filter"));

    expect(
      offenders,
      `Hand-written -webkit- prefixes make the minifier DROP the standard ` +
        `backdrop-filter, killing the blur in Chrome and Android. Delete them ` +
        `and let the build add prefixes from browserslist. Lines: ` +
        offenders.map((o) => o.n).join(", ")
    ).toEqual([]);
  });

  it("should still declare the standard backdrop-filter on every glass surface", () => {
    // The other half of the same guarantee: deleting the prefix is only correct
    // because the standard property is there to be prefixed.
    for (const cls of ["glass-surface", "glass-sheet", "glass-card"]) {
      const rule = css.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`))?.[0];
      expect(rule, `.${cls} should exist in globals.css`).toBeTruthy();
      expect(rule).toContain("backdrop-filter:");
    }
  });
});

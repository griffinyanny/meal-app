import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// ---------------------------------------------------------------------------
// BUG-060 — HOUSEHOLD CONTENT MUST NEVER REACH AN ATTRIBUTE.
// ---------------------------------------------------------------------------
//
// ⚠️ THE MASKING POSTURE HAS A HOLE THAT NO CONFIG CAN CLOSE. Session-replay
// masking runs through `session_recording.maskTextFn`, and rrweb calls that for
// TEXT NODES ONLY. Attributes are recorded VERBATIM, and the installed rrweb
// build exposes no attribute hook at all — measured against
// `node_modules/posthog-js/dist/rrweb.d.ts`, whose `recordOptions` offers
// `maskTextClass`, `maskTextSelector`, `maskAllInputs`, `maskInputOptions`,
// `maskInputFn` and `maskTextFn`, and nothing for attributes. Nor is there a
// central place to scrub it: posthog-js compresses each snapshot item inside
// the lazily-loaded recorder bundle, BEFORE `before_send` ever sees it.
//
// So the only fix is at the source, and the only guard is this one.
//
// ⚠️ WHAT IT COST TO FIND. `masking-check.ts` reported clean for a whole
// session while `aria-label="Check off Garlic"` sat in the payload, because the
// check was reading the outer envelope: the `/s/` body is gzipped with no
// `compression=` in its URL, and every large `$snapshot_data` item is gzipped
// AGAIN inside that. Two stacked vacuous passes over a real leak.
//
// ⚠️ AND THE PROJECT'S OWN RULES POINTED AT THE BUG. `.claude/rules/
// react-components.md` says "all interactive elements need aria labels", so
// `aria-label={`Check off ${item.name}`}` is what a careful person writes. The
// accessibility rule and the privacy posture were in direct conflict and
// nothing in the repo could see it.
//
// THE RULE: name a control from a TEXT NODE — its own contents, or
// `aria-labelledby` pointing at the element that already renders the name.
// Screen readers get the real string; the recording gets the masked one.

/** Walk `src/`, skipping tests. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Dynamic `aria-label` sites whose value is APP VOCABULARY, not household
 * content — each listed with the reason, because an unexplained exemption
 * outlives the reason for it (S52).
 *
 * ⚠️ A bare ban would be wrong and would teach people to edit the expectation
 * (S59). These are all fine; what is not fine is a recipe title, a meal title,
 * a grocery item, a dietary constraint, a memory, or an interview answer.
 */
const ALLOWED: Record<string, string> = {
  "components/shared/household-composer.tsx":
    'band labels — "Adults" / "Children", a fixed vocabulary',
  "components/you/field-edit-sheet.tsx":
    "stepper field labels, from the question set rather than the answer",
  "components/groceries/grocery-section.tsx":
    "CATEGORY_LABELS — the fixed aisle vocabulary",
  "components/you/chip-adder.tsx": "the adder's own static call-to-action",
  "components/shell/tab-bar.tsx": "tab names",
  "components/shared/freeform-field.tsx":
    "a caller-supplied static label; every call site passes a literal",
  "components/plan/rail/day-container.tsx":
    "a weekday name or an ISO date — the week's shape, not its contents",
};

// ⚠️ `meal-row.tsx` and `recipe-card.tsx` are deliberately ABSENT. Both were
// listed here while their fix was in flight, and the stale-exemption check
// below is what removed them: once the labels became
// `title ? undefined : "<static fallback>"`, the value can no longer carry
// content and the exemption had become a standing licence nobody would re-read.

/**
 * Strip comments before scanning.
 *
 * ⚠️ Not fussiness: the first run of this guard flagged
 * `grocery-row.tsx` for a `Check off ${name}` that existed only inside the
 * comment EXPLAINING the fix. A failure list pointing at correct code is worse
 * than no list, because it teaches people to edit the expectation (S59).
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const at = line.indexOf("//");
      if (at === -1) return line;
      // Only a real comment if the quotes before it are balanced — otherwise
      // this is a `https://` inside a string.
      const before = line.slice(0, at);
      const quotes = (before.match(/["'`]/g) ?? []).length;
      return quotes % 2 === 0 ? before : line;
    })
    .join("\n");
}

/**
 * Every `aria-label={…}` whose value is not a plain string literal.
 *
 * ⚠️ Reads by brace depth rather than `[^}]*`, because a label like
 * `{cond ? "a" : "b"}` is fine and `{`x ${y}`}` is not, and both contain braces
 * a naive match would stop at (S59's JSX-tag lesson, one attribute over).
 */
function dynamicAriaLabels(source: string): string[] {
  const found: string[] = [];
  const marker = "aria-label={";
  let i = source.indexOf(marker);
  while (i !== -1) {
    let depth = 1;
    let j = i + marker.length;
    while (j < source.length && depth > 0) {
      if (source[j] === "{") depth += 1;
      else if (source[j] === "}") depth -= 1;
      j += 1;
    }
    found.push(source.slice(i + marker.length, j - 1).trim());
    i = source.indexOf(marker, j);
  }
  return found;
}

/**
 * `{undefined}`, `{"a"}`, `{cond ? "a" : "b"}` — nothing interpolated.
 *
 * ⚠️ A ternary's CONDITION is not its value, so `isFavorite ? "Remove" : "Add"`
 * is static even though it names a field. Only what can end up in the attribute
 * matters. A template literal never can be, so a backtick is an immediate no.
 */
function isStaticExpression(expr: string): boolean {
  if (expr.includes("`")) return false;
  const q = expr.indexOf("?");
  const value = q === -1 ? expr : expr.slice(q + 1);
  const withoutLiterals = value
    .replace(/"[^"]*"/g, "")
    .replace(/'[^']*'/g, "")
    .replace(/\bundefined\b/g, "");
  return !/[A-Za-z_$]/.test(withoutLiterals);
}

describe("no household content reaches an aria-label (BUG-060)", () => {
  const offenders: string[] = [];
  const seenAllowed = new Set<string>();

  for (const file of sourceFiles(join(process.cwd(), "src"))) {
    const rel = relative(join(process.cwd(), "src"), file).replaceAll("\\", "/");
    for (const expr of dynamicAriaLabels(stripComments(readFileSync(file, "utf8")))) {
      if (isStaticExpression(expr)) continue;
      if (rel in ALLOWED) {
        seenAllowed.add(rel);
        continue;
      }
      offenders.push(`${rel}: aria-label={${expr}}`);
    }
  }

  it("has no unlisted dynamic aria-label", () => {
    expect(
      offenders,
      "A dynamic `aria-label` is a value rrweb records VERBATIM into session " +
        "replay, where masking cannot reach it. Name the control from a text " +
        "node (its own contents, or `aria-labelledby`), or — if the value is " +
        "app vocabulary rather than household content — add the file to " +
        "ALLOWED with the reason."
    ).toEqual([]);
  });

  it("carries no stale exemptions", () => {
    // ⚠️ A licence to ignore outlives the reason for it (S52). If a file stops
    // having a dynamic label, its entry has to go, or the list slowly becomes
    // a blanket permission nobody re-reads.
    const stale = Object.keys(ALLOWED).filter((f) => !seenAllowed.has(f));
    expect(stale, "exemptions for files that no longer need one").toEqual([]);
  });

  it("actually scanned something", () => {
    // Without this, a broken walker or a changed marker makes every assertion
    // above pass vacuously — the test that could not fail, produced three
    // separate ways in this project already.
    const total = sourceFiles(join(process.cwd(), "src")).reduce(
      (n, f) => n + dynamicAriaLabels(stripComments(readFileSync(f, "utf8"))).length,
      0
    );
    expect(total).toBeGreaterThan(5);
  });
});

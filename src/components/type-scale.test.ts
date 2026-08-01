import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A source-level guard for spec §05's ten-rung type ladder (1F/B8b).
//
// B8a named two rungs. This item named the other six and routed 169 content
// sites onto all ten — the build had been carrying THIRTY distinct type sizes,
// 192 of its 255 type sites off the ladder, because six of the ten rungs had no
// class and the four that did were barely reachable.
//
// ⚠️ THE FAILURE THIS FILE EXISTS FOR, because it bit during the item itself.
// The rungs live in `@layer components` (B8a's fix, so a call site can still
// choose colour). That means ANY leftover utility at the call site beats the
// rung: `font-bold`, `leading-tight`, `tracking-tight`, `italic`. Routing the
// first pass left EIGHTY-ONE lines where the class had been applied and a
// utility beside it was still deciding weight, leading or tracking — so the
// rung was present, correct, and doing nothing. That is a shape the screenshot
// cannot show (the type looks like type), the DOM cannot show (the class IS on
// the element), and `SH5` cannot show (it measures colour). It is only visible
// by reading the class string, which is what this does.
//
// B8a's lesson was "a layer can be aimed correctly and still lack the precision
// to answer." This is the companion: a fix can be APPLIED correctly and still be
// overridden by what was already there.

const SRC = join(__dirname, "..");
// This file quotes the class strings it forbids, so it must skip itself —
// `palette.test.ts` learned that the honest way, by failing against itself.
const SELF = join(__dirname, "type-scale.test.ts");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) && p !== SELF ? [p] : [];
  });
}

type Line = { file: string; n: number; line: string };

function lines(): Line[] {
  // Sorted, because `readdirSync` order is the filesystem's and a guard that
  // fails on directory ordering teaches people to edit the expectation.
  return walk(SRC)
    .sort()
    .flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ file: file.slice(SRC.length + 1), n: i + 1, line }))
    );
}

const at = (l: Line) => `${l.file}:${l.n}`;

// Each rung and the properties IT sets. A utility from a rung's own column at
// the same call site is not an override the gold line permits — it is the rung
// being forked. Colour is deliberately absent: the call site owns colour, which
// is the entire reason these live in `components` rather than `utilities`.
const RUNGS: Record<string, { weight: boolean; leading: boolean; tracking: boolean; italic: boolean; caps: boolean }> = {
  "spec-screen-title": { weight: true, leading: true, tracking: true, italic: false, caps: false },
  "spec-spoken-headline": { weight: true, leading: true, tracking: true, italic: false, caps: false },
  "spec-feature-line": { weight: true, leading: true, tracking: true, italic: false, caps: false },
  "spec-group-title": { weight: true, leading: true, tracking: true, italic: false, caps: false },
  "spec-row-title": { weight: true, leading: true, tracking: false, italic: false, caps: false },
  "spec-body": { weight: true, leading: true, tracking: false, italic: false, caps: false },
  "spec-chef-voice": { weight: true, leading: true, tracking: false, italic: true, caps: false },
  "spec-meta": { weight: true, leading: true, tracking: false, italic: false, caps: false },
  "spec-eyebrow": { weight: true, leading: false, tracking: true, italic: false, caps: true },
  "spec-label": { weight: true, leading: false, tracking: true, italic: false, caps: true },
};

const WEIGHT = /(?<![\w-])font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])(?![\w-])/;
const LEADING = /(?<![\w-])leading-(?:none|tight|snug|normal|relaxed|loose|\[[^\]]+\])(?![\w-])/;
const TRACKING = /(?<![\w-])tracking-(?:tighter|tight|normal|wide|wider|widest|\[[^\]]+\])(?![\w-])/;
const ITALIC = /(?<![\w-])italic(?![\w-])/;
const CAPS = /(?<![\w-])uppercase(?![\w-])/;

describe("type scale (spec §05)", () => {
  it("should never let a call-site utility override the rung beside it", () => {
    const offenders = lines().flatMap((l) =>
      Object.entries(RUNGS).flatMap(([rung, owns]) => {
        if (!new RegExp(`\\b${rung}\\b`).test(l.line)) return [];
        // ⚠️ ONE deliberate exception, and it is a rule rather than a list: a
        // safety-weighted site keeps its own weight. §05's rung is a default;
        // the emphasis on a SAFETY label is not decoration, and B8a's whole
        // regression was a safety label quietly losing a property written
        // beside it. Anything else fails.
        const safety = /destructive|SAFETY/.test(l.line);
        const bad: string[] = [];
        if (owns.weight && !safety && WEIGHT.test(l.line)) bad.push("font-weight");
        if (owns.leading && LEADING.test(l.line)) bad.push("leading");
        if (owns.tracking && TRACKING.test(l.line)) bad.push("tracking");
        if (owns.italic && ITALIC.test(l.line)) bad.push("italic");
        if (owns.caps && CAPS.test(l.line)) bad.push("uppercase");
        return bad.length ? [`${at(l)} .${rung} <- ${bad.join("+")}`] : [];
      })
    );

    expect(
      offenders,
      "A §05 rung lives in `@layer components`, so a utility at the same call " +
        "site WINS — the class is applied and does nothing. Delete the " +
        "utility, or if the deviation is deliberate, say so in the spec docs " +
        "and give the site its own class. Colour is the one thing the call " +
        "site is meant to decide. Offenders: "
    ).toEqual([]);
  });

  it("should never hand-write the chef's voice instead of taking the rung", () => {
    // The chef voice is the one rung that cannot be assigned by size: §05 calls
    // it "the only coloured running text in the product — always italic, always
    // first person." Before B8b it was drawn at THREE different sizes with
    // `italic` and `--spec-gold-voice` typed beside each one, while EIGHT
    // sites that were not the chef sat on its 14.5px measurement. Size never
    // knew the difference; this asserts nobody re-litigates it by hand.
    const offenders = lines()
      .filter((l) => /spec-gold-voice/.test(l.line) && ITALIC.test(l.line))
      .map(at);

    expect(
      offenders,
      "Gold + italic IS the chef-voice rung. Use `.spec-chef-voice` — it " +
        "carries size, weight, style and colour together, so the next site " +
        "cannot land on a fourth size. Offenders: "
    ).toEqual([]);
  });

  it("should keep every rung reachable — a named rung with no call sites is B4's dead class", () => {
    // B4 added `.spec-group-title` and routed nothing to it, so the rung existed
    // and still nobody could reach for it; B8a gave it its first call sites a
    // phase later. A rung nobody references generates exactly the defect an
    // unnamed rung does, so this asserts adoption rather than existence.
    const src = lines();
    const unused = Object.keys(RUNGS).filter(
      (rung) => !src.some((l) => new RegExp(`\\b${rung}\\b`).test(l.line))
    );
    expect(unused, "Rungs defined in globals.css that nothing uses: ").toEqual([]);
  });

  it("should not let hand-typed type sizes grow back", () => {
    // ⚠️ The honest limit of a source guard: it cannot tell a CONTENT site with
    // no rung from a CONTROL that is allowed a raw size, because that is a
    // question about what the text does and the string does not say. So this
    // does not try. It ratchets instead — the number of hand-typed sizes may
    // fall and may never rise, which is precisely how thirty sizes accumulated:
    // one reasonable-looking `text-[13px]` at a time, each invisible on its own.
    //
    // What is left is controls (§08 draws its own at 15 / 14.5 / 13.5, none of
    // which are §05 rungs), text inputs (16px, below which iOS Safari zooms the
    // viewport on focus), and two stepper numerals. Lowering this number is a
    // real improvement; raising it needs a reason in the diff.
    // ⚠️ S59 CORRECTION: this shipped at 71 while the assertion below measured
    // 26. The 71 was B8b's count of hand-typed sizes across the WHOLE of src/;
    // the guard excludes the three primitive paths, and the constant was never
    // re-derived after that exclusion went in. So the ratchet had FORTY-FIVE
    // notches of slack — forty-five new raw sizes could land before it fired.
    // A ratchet set above its own subject is not a ratchet, which is S55's
    // "present, correct, and unrun" in a numeric shape.
    //
    // Re-derived by setting this to -1 and reading the count off the failure,
    // rather than by trusting either the doc or a grep (BSD grep's \b gave a
    // third answer again). 26 -> 20 in this session: BUG-049's six inputs took
    // `.spec-input` instead of a size.
    const CEILING = 20;
    const PRIMITIVES = [
      "components/ui/", // shadcn — B3's precedent: change a primitive deliberately
      "components/debug/", // dev-only HUD, never shipped
      "components/shell/tab-bar.tsx", // chrome. §11 draws it; 10px is not content
    ];
    const RAW = /\btext-(?:\[[0-9.]+(?:px|rem)\]|xs|sm|base|lg|xl|2xl|3xl)\b/g;
    const count = lines()
      .filter((l) => !PRIMITIVES.some((p) => l.file.startsWith(p)))
      .reduce((n, l) => n + (l.line.match(RAW)?.length ?? 0), 0);

    expect(
      count,
      `Hand-typed type sizes outside the primitives. This is a RATCHET: it ` +
        `went 255 -> ${CEILING} in B8b and must not climb. If a new site needs ` +
        `a size, it almost certainly needs a §05 rung instead. Count: `
    ).toBeLessThanOrEqual(CEILING);
  });

  it("should never ship a text input that can zoom the iOS viewport (BUG-049)", () => {
    // iOS Safari zooms the viewport when a focused input renders below 16px and
    // does not zoom back. Five fields were under it, including BOTH grocery
    // inline edits — the ones used standing in a shop.
    //
    // ⚠️ This asserts the CLASS, not a size, and that is the point. The pattern
    // existed before the bug did: `ui/input.tsx` carried shadcn's `text-base
    // md:text-sm` privately, and nothing inherited it because nothing else used
    // that primitive. The tracker's filed fix was "copy that string to all
    // five" — which is how a sixth site gets it wrong. Naming the floor is what
    // makes it inheritable, so the assertion is "did you reach for the name."
    // ⚠️ Read the tag by BRACE DEPTH, not by `[^>]*`. The first attempt used
    // the latter and reported four already-fixed sites as offenders, because
    // JSX attributes contain `>` — `onChange={(e) => …}` ends the match long
    // before the className. A guard that stops early does not under-report, it
    // MIS-reports, which is worse: the failure list points at fixed code.
    const openTag = (src: string, from: number) => {
      let depth = 0;
      for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) return src.slice(from, i + 1);
      }
      return src.slice(from);
    };

    const offenders = walk(SRC)
      .sort()
      .filter(
        (f) =>
          !f.includes("/ui/") && // the shared primitive — asserted directly below
          !f.includes("/debug/") && // dev-only HUD, never shipped
          !/\.test\.tsx?$/.test(f) // a tag quoted inside a test is not a rendered input
      )
      .flatMap((file) => {
        const src = readFileSync(file, "utf8");
        return [...src.matchAll(/<(input|textarea)\b/g)].flatMap((m) => {
          const tag = openTag(src, m.index);
          if (/\bspec-input\b/.test(tag)) return [];
          // A control with no text caret gives iOS nothing to zoom for.
          if (/type=["'](?:checkbox|radio|file|hidden|range|submit|button)["']/.test(tag)) return [];
          return [`${file.slice(SRC.length + 1)}:${src.slice(0, m.index).split("\n").length}`];
        });
      });

    expect(
      offenders,
      "A text input below 16px zooms the iOS viewport on focus and never zooms " +
        "back. Take `.spec-input` — it is the named floor, not a size to retype. " +
        "Offenders: "
    ).toEqual([]);
  });

  it("should keep the input floor on the shared primitive too", () => {
    // The primitive is excluded from the sweep above (it renders `<InputPrimitive`,
    // not a lowercase tag), so it gets its own assertion rather than a silent pass.
    // It is also the site that OWNED the pattern privately before it had a name.
    const src = readFileSync(join(SRC, "components/ui/input.tsx"), "utf8");
    expect(src).toMatch(/\bspec-input\b/);
    // ⚠️ Strip comments first. The primitive's own comment NAMES the string
    // being forbidden, so the first version of this failed against prose that
    // was documenting the fix. Fourth instance — `palette.test.ts` and
    // `caps-rungs.test.ts` both learned it the same way, and this file's header
    // already says a guard has to skip itself. Skipping ITSELF is not enough:
    // it also has to skip the code's explanation of it.
    const code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(
      code,
      "shadcn's `md:` step-down is a second answer to one question"
    ).not.toMatch(/\bmd:text-sm\b/);
  });

  it("should not let a rung's own metrics be retyped as utilities", () => {
    // How thirty sizes happened: the metrics get copied rather than the class.
    // Each pair below is a rung's exact size plus one other property it owns,
    // which is the signature of a fork rather than a coincidence.
    const forks = [
      /text-\[32px\][^"]*font-\[?700/,
      /text-\[26px\][^"]*font-\[?650/,
      /text-\[22px\][^"]*font-\[?650/,
      /text-\[19px\][^"]*font-\[?650/,
      /text-\[15\.5px\][^"]*font-\[?600/,
      /text-\[14\.5px\][^"]*italic/,
      /text-\[11px\][^"]*tracking-\[2px\]/,
      /text-\[10\.5px\][^"]*tracking-\[1\.3px\]/,
    ];
    const offenders = lines()
      .filter((l) => forks.some((f) => f.test(l.line)))
      .map(at);
    expect(
      offenders,
      "These are a rung's own metrics typed out beside each other. Use the " +
        "class — that is what it is for. Offenders: "
    ).toEqual([]);
  });
});

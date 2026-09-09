import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_EVENTS,
  type AllEventsIsExhaustive,
  type EventName,
  type TaxonomyCarriesNoFreeText,
} from "./events";

// ---------------------------------------------------------------------------
// The two compile-time guards, asserted here so their failure is legible.
// ---------------------------------------------------------------------------
//
// ⚠️ These do NOT fail `npm run test:run` — they fail `npm run typecheck`,
// which is in the same gauntlet. That is deliberate and it is the stronger
// position: a leak becomes un-buildable rather than un-shipped. Stated rather
// than assumed, because a guard that quietly grades nothing is this project's
// most-repeated defect (S55 "present, correct, and unrun").
//
// Both were verified by forcing the failure — see the note at the bottom.

/** No event property may hold a wide `string` (i.e. user content). */
const _taxonomyIsClean: TaxonomyCarriesNoFreeText = true;

/** `ALL_EVENTS` covers every key of `EventMap`. */
const _allEventsIsExhaustive: AllEventsIsExhaustive = true;

describe("event taxonomy", () => {
  it("exposes a non-trivial, unique set of event names", () => {
    expect(ALL_EVENTS.length).toBeGreaterThan(30);
    expect(new Set(ALL_EVENTS).size).toBe(ALL_EVENTS.length);
  });

  it("names every event in snake_case with no vendor prefix", () => {
    for (const name of ALL_EVENTS) {
      expect(name).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
      // PostHog reserves `$`-prefixed names for its own autocapture events.
      expect(name.startsWith("$")).toBe(false);
    }
  });

  it("keeps the compile-time guards referenced so they cannot be dropped", () => {
    expect(_taxonomyIsClean).toBe(true);
    expect(_allEventsIsExhaustive).toBe(true);
  });

  // ⚠️ The doc is the artifact a person reads and the code is what runs. A
  // taxonomy that drifts from its own document is how "the S9 taxonomy" became
  // a thing six docs cited and nobody had. This fails when they disagree.
  //
  // ⚠️ SKIPPED IN A PUBLIC CHECKOUT, DELIBERATELY AND VISIBLY. `docs/` is the
  // private layer and is not part of the public repo, so this assertion has no
  // subject there — and reading the missing file made `npm test` fail for
  // anyone who cloned it, which CI caught on its first run. `skipIf` rather
  // than a silent early return so the runner PRINTS it as skipped: a guard that
  // quietly passes when its subject is absent is worse than one that is absent.
  // It still runs wherever `docs/` exists, which is where the taxonomy is edited.
  it.skipIf(!existsSync(join(process.cwd(), "docs/observability-taxonomy.md")))(
    "matches the event list in docs/observability-taxonomy.md",
    () => {
      const doc = readFileSync(
        join(process.cwd(), "docs/observability-taxonomy.md"),
        "utf8"
      );

      const documented = new Set(
        [...doc.matchAll(/^\| `([a-z][a-z0-9_]*)` \|/gm)].map((m) => m[1])
      );

      // A scrape that matches nothing would make both comparisons below pass
      // vacuously, which is the same failure as the missing file one layer in.
      expect(documented.size, "the taxonomy scrape found no events").toBeGreaterThan(0);

      const missingFromDoc = ALL_EVENTS.filter((e) => !documented.has(e));
      expect(missingFromDoc, "events in code but not documented").toEqual([]);

      const codeNames = new Set<string>(ALL_EVENTS as readonly EventName[]);
      const missingFromCode = [...documented].filter((e) => !codeNames.has(e));
      expect(missingFromCode, "events documented but not in code").toEqual([]);
    }
  );
});

// ---------------------------------------------------------------------------
// Force-failure record (S63), because "the guard is green" is not evidence.
// ---------------------------------------------------------------------------
//
// 1. Free-text guard: added `item_name: string` to `grocery_item_added`.
//    `npm run typecheck` failed on `_taxonomyIsClean` with the offending event
//    named in the error text. Removed → green.
// 2. Exhaustiveness guard: added `foo_happened: {}` to `EventMap` without
//    touching `ALL_EVENTS`. `npm run typecheck` failed on
//    `_allEventsIsExhaustive`. Removed → green.
// 3. Doc-sync test: renamed one event in code only. The test failed naming it.

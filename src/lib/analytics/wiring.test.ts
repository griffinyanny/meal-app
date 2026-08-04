import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ALL_EVENTS } from "./events";

// ---------------------------------------------------------------------------
// WHICH EVENTS ARE ACTUALLY WIRED — the guard against this session's own theme.
// ---------------------------------------------------------------------------
//
// ⚠️ A declared event is not a captured event. `events.ts` is a taxonomy, and
// `docs/observability-taxonomy.md` is a table — neither can tell you whether
// anything ever CALLS the thing. That gap is exactly the shape of the claim
// that started this work: "the event taxonomy from S9", cited in six documents
// as an available input, describing an artifact that had not existed since S18.
//
// So the wired set is written down explicitly and checked against the source.
// Three ways to fail, all of them useful:
//
//   1. An event listed here that nothing calls → the list is aspirational.
//   2. An event called in `src/` that is not listed here → someone wired one
//      and the status table in the doc is now stale.
//   3. (By construction) everything else is UNWIRED and visibly so — the
//      remainder is the honest backlog, not an assumption.

/**
 * Events with a real call site in `src/` as of S63.
 *
 * The north-star funnel is complete end to end, because it is what the DoD's
 * time-to-list measurement and Workstream E's gate both need. The rest of the
 * taxonomy is designed and typed but not yet called — see the doc's status
 * column and `docs/whats-next.md`.
 */
const WIRED = [
  "ritual_started",
  "plan_generated",
  "plan_generation_failed",
  "plan_confirmed",
  "list_ready",
  "ritual_abandoned",
  "app_launched",
  "connectivity_changed",
] as const;

/** Walk `src/`, skipping tests — a name mentioned in a test is not wiring. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(full, acc);
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Every `track("name"` / `trackServer(…, "name"` literal in `src/`.
 *
 * Read off disk rather than shelled out to `git grep`: no shell, no dependency
 * on the repo's ignore rules, and it works in a checkout with uncommitted
 * files — which is exactly when this check matters.
 */
function wiredInSource(): Set<string> {
  const pattern = /\btrack(?:Server)?\s*\((?:[^,()]+,\s*)?"([a-z][a-z0-9_]*)"/g;
  const found = new Set<string>();

  for (const file of sourceFiles(join(process.cwd(), "src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      if ((ALL_EVENTS as readonly string[]).includes(match[1])) {
        found.add(match[1]);
      }
    }
  }
  return found;
}

describe("event wiring", () => {
  const found = wiredInSource();

  it("finds call sites at all (the grep itself must be able to fail)", () => {
    // ⚠️ Without this, a broken grep returns an empty set and every assertion
    // below passes vacuously — S51's "a test that could not fail", which this
    // project has now produced three separate ways.
    expect(found.size).toBeGreaterThan(0);
  });

  it("every event claimed wired has a real call site in src/", () => {
    const claimedButAbsent = WIRED.filter((e) => !found.has(e));
    expect(claimedButAbsent, "listed as wired but never called").toEqual([]);
  });

  it("every event called in src/ is claimed wired", () => {
    const calledButUnclaimed = [...found].filter(
      (e) => !(WIRED as readonly string[]).includes(e)
    );
    expect(
      calledButUnclaimed,
      "wired but missing from WIRED — update the status table in docs/observability-taxonomy.md"
    ).toEqual([]);
  });

  it("reports the unwired remainder as a known, explicit backlog", () => {
    const unwired = ALL_EVENTS.filter(
      (e) => !(WIRED as readonly string[]).includes(e)
    );
    // Not zero, and that is the honest state at S63. This assertion exists so
    // the number cannot drift silently in EITHER direction: wiring more events
    // without updating WIRED fails the test above, and the doc's status table
    // is checked against this same list.
    expect(unwired.length).toBe(ALL_EVENTS.length - WIRED.length);
    expect(unwired).toContain("grocery_item_checked");
  });
});

// The report is an evidence document, so its arithmetic is tested like any other
// utility: a summary that can drift from the runs it describes is decoration.
import { describe, expect, it } from "vitest";
import { computeTotals, renderResults, totalCost, truncatedRuns } from "./report";
import type { CaseResult, EvalRunResults } from "./runner";

function check(
  name: string,
  kind: CaseResult["checks"][number]["kind"],
  passed: number,
  total: number,
  skipped = 0
) {
  return { name, kind, passed, total, skipped, failureDetails: [] };
}

function run(overrides: Partial<EvalRunResults> = {}): EvalRunResults {
  return {
    task: "preferences-talk",
    mode: "real",
    repeat: 3,
    startedAt: "2026-09-09T00:00:00.000Z",
    finishedAt: "2026-09-09T00:01:00.000Z",
    definedCases: 1,
    cases: [
      {
        name: "an allergy is captured",
        bucket: "regression",
        observations: [],
        checks: [check("flagged allergy", "must-hold", 3, 3), check("reply mentions it", "reported", 2, 3)],
      },
    ],
    cost: {
      generator: { calls: 3, inputTokens: 1_000_000, outputTokens: 1_000_000 },
      judge: { calls: 0, inputTokens: 0, outputTokens: 0 },
      totalUsd: 2,
    },
    ...overrides,
  };
}

describe("computeTotals", () => {
  it("counts observations by check kind", () => {
    const totals = computeTotals([run()]);
    expect(totals.mustHold).toEqual({ passed: 3, total: 3 });
    expect(totals.reported).toEqual({ passed: 2, total: 3 });
    expect(totals.cases).toBe(1);
  });

  it("excludes skipped judged checks from the denominator", () => {
    const totals = computeTotals([
      run({
        cases: [
          {
            name: "judged case",
            bucket: "happy",
            observations: [],
            checks: [check("is plausible", "judged", 1, 1, 2)],
          },
        ],
      }),
    ]);
    // Two of three judge calls were unavailable; only the one that returned a
    // verdict is scored, and the skips are surfaced rather than counted as passes.
    expect(totals.judged).toEqual({ passed: 1, total: 1, skipped: 2 });
  });

  it("separates a reproduced gate failure from one that did not reproduce", () => {
    const totals = computeTotals([
      run({
        cases: [
          {
            name: "confirmed",
            bucket: "regression",
            observations: [],
            checks: [check("x", "must-hold", 2, 3)],
            gate: { check: "x", reproduced: true },
          },
          {
            name: "flake",
            bucket: "regression",
            observations: [],
            checks: [check("y", "must-hold", 7, 8)],
            gate: { check: "y", reproduced: false },
          },
        ],
      }),
    ]);
    expect(totals.gatesFailed).toEqual(["preferences-talk · confirmed · x"]);
    expect(totals.unreproduced).toEqual(["preferences-talk · flake · y"]);
  });
});

describe("truncatedRuns", () => {
  it("catches a shard written by a filtered run", () => {
    // The real incident: a single-case negative-control run overwrote a task's
    // shard, and the committed report described 44 cases instead of 51 while
    // presenting a deliberately planted defect as a genuine finding.
    const partial = run({ definedCases: 8 });
    expect(truncatedRuns([partial])).toHaveLength(1);
  });

  it("passes a complete run", () => {
    expect(truncatedRuns([run({ definedCases: 1 })])).toHaveLength(0);
  });

  it("does not block a shard written before the field existed", () => {
    const legacy = run();
    delete (legacy as { definedCases?: number }).definedCases;
    expect(truncatedRuns([legacy])).toHaveLength(0);
  });
});

describe("totalCost", () => {
  it("prices generator and judge tokens separately and sums across tasks", () => {
    const cost = totalCost([run(), run({ task: "plan-generate" })]);
    expect(cost.generator.calls).toBe(6);
    // 2M input at $0.40/M + 2M output at $1.60/M = $4.00
    expect(cost.totalUsd).toBeCloseTo(4, 5);
  });
});

describe("renderResults", () => {
  const meta = { commit: "abc1234", promptsHash: "0123456789ab", generatedAt: "2026-09-09" };

  it("records the fingerprint the freshness test reads back", () => {
    const markdown = renderResults([run()], meta);
    expect(markdown).toContain("| Prompt fingerprint | `0123456789ab` |");
    expect(markdown).toContain("| Commit | `abc1234` |");
  });

  it("calls out a confirmed failure and a non-reproducing one differently", () => {
    const markdown = renderResults(
      [
        run({
          cases: [
            {
              name: "confirmed",
              bucket: "regression",
              observations: [],
              checks: [check("x", "must-hold", 2, 3)],
              gate: { check: "x", reproduced: true },
            },
          ],
        }),
      ],
      meta
    );
    expect(markdown).toContain("### Confirmed failures");
    expect(markdown).not.toContain("### Failures that did not reproduce");
  });

  it("omits both failure sections on a clean run", () => {
    const markdown = renderResults([run()], meta);
    expect(markdown).not.toContain("### Confirmed failures");
    expect(markdown).not.toContain("### Failures that did not reproduce");
  });
});

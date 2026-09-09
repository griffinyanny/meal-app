// Turns the per-task results shards into the committed RESULTS.md.
//
// The rendering functions here are pure and unit-tested, because a report is an
// evidence document: if the summary can drift from the runs it describes, the
// numbers in it are decoration.
import type { CaseResult, CheckSummary, EvalRunResults } from "./runner";
import { PRICING, usdFor, type RunCost } from "./meter";

export interface Totals {
  cases: number;
  observations: number;
  mustHold: { passed: number; total: number };
  reported: { passed: number; total: number };
  judged: { passed: number; total: number; skipped: number };
  invariant: { total: number };
  gatesFailed: string[];
  unreproduced: string[];
}

const rate = (passed: number, total: number): string =>
  total === 0 ? "n/a" : `${Math.round((passed / total) * 100)}%`;

function kindTotals(runs: EvalRunResults[], kind: CheckSummary["kind"]) {
  let passed = 0;
  let total = 0;
  let skipped = 0;
  for (const run of runs) {
    for (const c of run.cases) {
      for (const check of c.checks) {
        if (check.kind !== kind) continue;
        passed += check.passed;
        total += check.total;
        skipped += check.skipped;
      }
    }
  }
  return { passed, total, skipped };
}

export function computeTotals(runs: EvalRunResults[]): Totals {
  const gatesFailed: string[] = [];
  const unreproduced: string[] = [];
  for (const run of runs) {
    for (const c of run.cases) {
      if (!c.gate) continue;
      const label = `${run.task} · ${c.name} · ${c.gate.check}`;
      if (c.gate.reproduced) gatesFailed.push(label);
      else unreproduced.push(label);
    }
  }

  // must-hold and reported checks are never skipped (only a judged check can be,
  // when the judge is unavailable), so their totals carry just the two numbers.
  const mustHold = kindTotals(runs, "must-hold");
  const reported = kindTotals(runs, "reported");

  return {
    cases: runs.reduce((n, r) => n + r.cases.length, 0),
    observations: runs.reduce(
      (n, r) => n + r.cases.reduce((m, c) => m + c.observations.length, 0),
      0
    ),
    mustHold: { passed: mustHold.passed, total: mustHold.total },
    reported: { passed: reported.passed, total: reported.total },
    judged: kindTotals(runs, "judged"),
    invariant: { total: kindTotals(runs, "invariant").total },
    gatesFailed,
    unreproduced,
  };
}

export function totalCost(runs: EvalRunResults[]): RunCost {
  const sum = (pick: (c: RunCost) => { calls: number; inputTokens: number; outputTokens: number }) =>
    runs.reduce(
      (acc, r) => {
        const u = pick(r.cost);
        return {
          calls: acc.calls + u.calls,
          inputTokens: acc.inputTokens + u.inputTokens,
          outputTokens: acc.outputTokens + u.outputTokens,
        };
      },
      { calls: 0, inputTokens: 0, outputTokens: 0 }
    );
  const generator = sum((c) => c.generator);
  const judge = sum((c) => c.judge);
  return {
    generator,
    judge,
    totalUsd: usdFor(generator, PRICING.generator) + usdFor(judge, PRICING.judge),
  };
}

function caseLine(c: CaseResult): string {
  const scored = c.checks.filter((k) => k.kind === "must-hold" || k.kind === "reported");
  const passed = scored.reduce((n, k) => n + k.passed, 0);
  const total = scored.reduce((n, k) => n + k.total, 0);
  const flag = c.gate?.reproduced ? " ⛔" : c.gate ? " ⚠️" : "";
  return `| ${c.name}${flag} | ${c.bucket} | ${rate(passed, total)} |`;
}

function checkLines(runs: EvalRunResults[]): string[] {
  const rows: string[] = [];
  for (const run of runs) {
    for (const c of run.cases) {
      for (const check of c.checks) {
        if (check.kind === "invariant") continue;
        if (check.total === 0 || check.passed === check.total) continue;
        rows.push(
          `| ${run.task} | ${check.name} | ${check.kind} | ${check.passed}/${check.total} | ${
            check.failureDetails[0]?.replace(/\|/g, "/").slice(0, 120) ?? ""
          } |`
        );
      }
    }
  }
  return rows;
}

/**
 * Every judged check with its rate, whether or not it passed.
 *
 * These are the product-quality questions — "would a person cook this week" — so
 * they belong in the report as standing numbers rather than appearing only when
 * something breaks. They are also the rows a human audit reads when calibrating
 * the judge.
 */
export function judgedLines(runs: EvalRunResults[]): string[] {
  const rows: string[] = [];
  for (const run of runs) {
    for (const c of run.cases) {
      for (const check of c.checks) {
        if (check.kind !== "judged") continue;
        const scored = check.total > 0;
        rows.push(
          `| ${run.task} | ${check.name} | ${
            scored ? `${check.passed}/${check.total}` : "—"
          } | ${check.skipped || "0"} | ${
            check.failureDetails[0]?.replace(/\|/g, "/").slice(0, 110) ?? ""
          } |`
        );
      }
    }
  }
  return rows;
}

/**
 * Shards holding fewer cases than their suite defines — i.e. written by a
 * filtered run, and unfit to build a report from.
 *
 * Shards written before this field existed carry no `definedCases`; those are
 * treated as complete rather than blocking, since there is nothing to compare.
 */
export function truncatedRuns(runs: EvalRunResults[]): EvalRunResults[] {
  return runs.filter(
    (r) => typeof r.definedCases === "number" && r.cases.length < r.definedCases
  );
}

export interface ReportMeta {
  commit: string;
  promptsHash: string;
  generatedAt: string;
}

export function renderResults(runs: EvalRunResults[], meta: ReportMeta): string {
  const totals = computeTotals(runs);
  const cost = totalCost(runs);
  const mode = runs[0]?.mode ?? "real";
  const failing = checkLines(runs);

  const lines: string[] = [
    "# Eval results",
    "",
    "Generated by `npm run eval`. Committed with the change that produced it — see",
    "[README.md](./README.md) for what these numbers mean and how they are graded.",
    "",
    "| | |",
    "| --- | --- |",
    `| Run | ${meta.generatedAt} |`,
    `| Commit | \`${meta.commit}\` |`,
    `| Mode | ${mode === "real" ? "real model" : "fixtures (mock)"} |`,
    `| Generator | \`${PRICING.generator.model}\` |`,
    `| Judge | \`${PRICING.judge.model}\` |`,
    `| Cases | ${totals.cases} across ${runs.length} tasks |`,
    `| Model calls | ${cost.generator.calls} generator, ${cost.judge.calls} judge |`,
    `| Measured cost | $${cost.totalUsd.toFixed(3)} (rates as of ${PRICING.asOf}) |`,
    `| Prompt fingerprint | \`${meta.promptsHash}\` |`,
    "",
    "## Headline",
    "",
    `- **Must-hold checks: ${rate(totals.mustHold.passed, totals.mustHold.total)}** (${
      totals.mustHold.passed
    }/${totals.mustHold.total} observations). These gate the suite.`,
    `- **Reported quality checks: ${rate(totals.reported.passed, totals.reported.total)}** (${
      totals.reported.passed
    }/${totals.reported.total}). Recorded, never gated.`,
    `- **Judged checks: ${rate(totals.judged.passed, totals.judged.total)}** (${
      totals.judged.passed
    }/${totals.judged.total}${
      totals.judged.skipped ? `, ${totals.judged.skipped} skipped` : ""
    }). Advisory until the judge is calibrated.`,
    `- ${totals.invariant.total} invariant observations confirm the pipeline ran; they are not model quality.`,
    "",
  ];

  if (totals.gatesFailed.length) {
    lines.push(
      "### Confirmed failures",
      "",
      "A must-hold check failed and failed again on re-run:",
      "",
      ...totals.gatesFailed.map((g) => `- ⛔ ${g}`),
      ""
    );
  }
  if (totals.unreproduced.length) {
    lines.push(
      "### Failures that did not reproduce",
      "",
      `A must-hold check failed once, then passed on every one of the re-runs. Recorded rather than`,
      "hidden: a rare safety miss is worth seeing even when it does not gate.",
      "",
      ...totals.unreproduced.map((g) => `- ⚠️ ${g}`),
      ""
    );
  }

  for (const run of runs) {
    lines.push(
      `## ${run.task}`,
      "",
      `${run.cases.length} cases · ${run.repeat} run${run.repeat > 1 ? "s" : ""} each · ${
        run.cost.generator.calls
      } model calls`,
      "",
      "| Case | Bucket | Pass rate |",
      "| --- | --- | --- |",
      ...run.cases.map(caseLine),
      ""
    );
  }

  const judged = judgedLines(runs);
  if (judged.length) {
    lines.push(
      "## Judged checks",
      "",
      "Graded by a second model from a different family. **Advisory** — recorded, never gating,",
      "until the judge is calibrated against human labels. A skipped row means the judge was",
      "unavailable for that observation, which is reported rather than counted as a pass.",
      "",
      "| Task | Question | Passed | Skipped | A verdict, where one failed |",
      "| --- | --- | --- | --- | --- |",
      ...judged,
      ""
    );
  }

  if (failing.length) {
    lines.push(
      "## Every check that did not pass every time",
      "",
      "| Task | Check | Kind | Passed | First failure |",
      "| --- | --- | --- | --- | --- |",
      ...failing,
      ""
    );
  }

  return lines.join("\n");
}

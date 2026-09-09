// The eval runner: turns a list of cases into vitest tests, runs each one several
// times against the real model, and decides what is allowed to fail the suite.
//
// THE GATING RULE, which is the whole reason this file exists:
//
//   A model is stochastic, so a single failing sample is evidence of nothing. If
//   a must-hold check fails, the case is re-run REPRO_REPEATS more times and only
//   a second failure fails the build. Every other check is recorded as a rate and
//   reported, never gated — a number that moved between runs is a better
//   regression signal than a red build nobody trusts.
//
// Gating on a pass-rate threshold was the obvious design and it is wrong here:
// across ~15 cases at 3 repeats, normal sampling noise crosses any threshold set
// close enough to the baseline to be useful, so the suite would go red on an
// unchanged codebase more often than not.
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Check, CheckKind } from "./checks";
import { setupEvalEnv, type EvalMode } from "./env";
import { startMetering, stopMetering, currentCost, type RunCost } from "./meter";

export type Bucket = "happy" | "edge" | "adversarial" | "regression";

/** Extra runs used to confirm a must-hold failure before it fails the build. */
export const REPRO_REPEATS = 5;

export interface EvalCase<T> {
  name: string;
  bucket: Bucket;
  /** Where this case came from — a real defect, a support-style report, or invented. */
  provenance?: string;
  run: () => Promise<T>;
  checks: Check<T>[];
}

export interface EvalSuiteOptions<T> {
  task: string;
  repeat: number;
  cases: EvalCase<T>[];
  /** Compact form stored in the results file, so outputs stay reviewable without bloat. */
  summarize?: (output: T) => unknown;
  /** Ceiling per run of a single case; the test timeout is derived from it. */
  perRunBudgetMs?: number;
}

export interface CheckObservation {
  name: string;
  kind: CheckKind;
  passed: boolean;
  detail?: string;
  skipped?: boolean;
}

export interface Observation {
  index: number;
  ok: boolean;
  error?: string;
  output?: unknown;
  checks: CheckObservation[];
}

export interface CheckSummary {
  name: string;
  kind: CheckKind;
  passed: number;
  total: number;
  skipped: number;
  failureDetails: string[];
}

export interface CaseResult {
  name: string;
  bucket: Bucket;
  provenance?: string;
  observations: Observation[];
  checks: CheckSummary[];
  gate?: { check: string; reproduced: boolean; detail?: string };
}

export interface EvalRunResults {
  task: string;
  mode: EvalMode;
  repeat: number;
  startedAt: string;
  finishedAt: string;
  cases: CaseResult[];
  cost: RunCost;
}

/** `withRetry` rewrites every failure into one of two canned strings; the real one is in `.cause`. */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const message =
      current instanceof Error ? current.message : String(current);
    if (message && !parts.includes(message)) parts.push(message);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" ← ") || "unknown error";
}

async function observe<T>(
  evalCase: EvalCase<T>,
  index: number,
  checks: Check<T>[],
  summarize?: (output: T) => unknown
): Promise<Observation> {
  let output: T;
  try {
    output = await evalCase.run();
  } catch (error) {
    // A thrown pipeline is a real outcome, not a harness crash: every check on
    // this observation counts as failed, with the unwrapped cause recorded.
    const detail = describeError(error);
    return {
      index,
      ok: false,
      error: detail,
      checks: checks.map((check) => ({
        name: check.name,
        kind: check.kind,
        passed: false,
        detail: `pipeline threw: ${detail}`,
      })),
    };
  }

  const results: CheckObservation[] = [];
  for (const check of checks) {
    const outcome = await check.evaluate(output);
    results.push({
      name: check.name,
      kind: check.kind,
      passed: outcome.passed,
      detail: outcome.detail,
      skipped: outcome.skipped,
    });
  }

  return {
    index,
    ok: true,
    output: summarize ? summarize(output) : undefined,
    checks: results,
  };
}

function summarize(observations: Observation[], checks: Check<unknown>[]): CheckSummary[] {
  return checks.map((check) => {
    const seen = observations.flatMap((o) =>
      o.checks.filter((c) => c.name === check.name)
    );
    const scored = seen.filter((c) => !c.skipped);
    return {
      name: check.name,
      kind: check.kind,
      passed: scored.filter((c) => c.passed).length,
      total: scored.length,
      skipped: seen.length - scored.length,
      failureDetails: Array.from(
        new Set(scored.filter((c) => !c.passed && c.detail).map((c) => c.detail as string))
      ).slice(0, 3),
    };
  });
}

export function defineEvalSuite<T>(options: EvalSuiteOptions<T>): void {
  const { task, repeat, cases, perRunBudgetMs = 30_000 } = options;
  const results: CaseResult[] = [];
  let mode: EvalMode = "real";
  const startedAt = new Date().toISOString();

  describe(`eval: ${task}`, () => {
    beforeAll(() => {
      mode = setupEvalEnv();
      startMetering();
    });

    afterAll(() => {
      stopMetering();
      const payload: EvalRunResults = {
        task,
        mode,
        repeat,
        startedAt,
        finishedAt: new Date().toISOString(),
        cases: results,
        cost: currentCost(),
      };
      const dir = path.resolve(__dirname, "..", "results");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, `${task}.${mode}.json`),
        JSON.stringify(payload, null, 2)
      );
    });

    for (const evalCase of cases) {
      const timeout = (repeat + REPRO_REPEATS) * perRunBudgetMs;

      test(
        evalCase.name,
        async () => {
          const observations: Observation[] = [];
          for (let i = 0; i < repeat; i++) {
            observations.push(
              await observe(evalCase, i, evalCase.checks, options.summarize)
            );
          }

          const mustHold = evalCase.checks.filter((c) => c.kind === "must-hold");
          const firstFailure = observations
            .flatMap((o) => o.checks)
            .find((c) => c.kind === "must-hold" && !c.passed);

          let gate: CaseResult["gate"];
          if (firstFailure) {
            // Reproduce before believing it. A one-off failure on a stochastic
            // model is a sample, not a regression.
            let reproduced = false;
            let detail = firstFailure.detail;
            for (let i = 0; i < REPRO_REPEATS; i++) {
              const extra = await observe(
                evalCase,
                repeat + i,
                mustHold,
                options.summarize
              );
              observations.push(extra);
              const failed = extra.checks.find((c) => !c.passed);
              if (failed) {
                reproduced = true;
                detail = failed.detail ?? detail;
                break;
              }
            }
            gate = { check: firstFailure.name, reproduced, detail };
          }

          results.push({
            name: evalCase.name,
            bucket: evalCase.bucket,
            provenance: evalCase.provenance,
            observations,
            checks: summarize(observations, evalCase.checks as Check<unknown>[]),
            gate,
          });

          if (gate?.reproduced) {
            expect.fail(
              `must-hold check failed and reproduced: "${gate.check}"` +
                (gate.detail ? `\n  ${gate.detail}` : "")
            );
          }
        },
        timeout
      );
    }
  });
}

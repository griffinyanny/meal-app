// Call + token accounting for an eval run.
//
// The app's AI logger already prints `[AI] <task> | <model> | <ms> | <in>+<out> tokens | ok`
// on every call (in development, which `setupEvalEnv` selects). Sniffing that line
// is how the suite reports MEASURED spend instead of an estimate that quietly ages
// with the price list. Judge calls don't go through that logger, so they report
// their usage directly via `recordJudgeUsage`.
export interface Usage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface RunCost {
  generator: Usage;
  judge: Usage;
  totalUsd: number;
}

// USD per 1M tokens. Dated because it WILL drift — the report prints the rates it
// used alongside the total so a stale number is visible rather than silent.
export const PRICING = {
  asOf: "2026-09-09",
  generator: { model: "gpt-4.1-mini", inputPerM: 0.4, outputPerM: 1.6 },
  judge: { model: "gemini-3.5-flash-lite", inputPerM: 0.3, outputPerM: 2.5 },
} as const;

const AI_LOG = /^\[AI\] (\S+) \| (\S+) \| \d+ms \| (\d+)\+(\d+) tokens/;

const generator: Usage = { calls: 0, inputTokens: 0, outputTokens: 0 };
const judge: Usage = { calls: 0, inputTokens: 0, outputTokens: 0 };
let originalLog: typeof console.log | null = null;

export function recordJudgeUsage(inputTokens: number, outputTokens: number): void {
  judge.calls += 1;
  judge.inputTokens += inputTokens;
  judge.outputTokens += outputTokens;
}

/**
 * Start counting generator calls by intercepting the app's own log line.
 *
 * Also silences those lines: a 50-case run emits hundreds of them and they bury
 * the eval output. Anything that isn't an AI log line passes through untouched.
 */
export function startMetering(): void {
  if (originalLog) return;
  originalLog = console.log;
  console.log = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string") {
      const match = AI_LOG.exec(first);
      if (match) {
        generator.calls += 1;
        generator.inputTokens += Number(match[3]);
        generator.outputTokens += Number(match[4]);
        return;
      }
      // `validatePlan` narrates its own absorption pass; not useful here.
      if (first.startsWith("[plan] absorbed")) return;
    }
    originalLog?.(...args);
  };
}

export function stopMetering(): void {
  if (originalLog) {
    console.log = originalLog;
    originalLog = null;
  }
}

export function usdFor(usage: Usage, rates: { inputPerM: number; outputPerM: number }): number {
  return (
    (usage.inputTokens / 1_000_000) * rates.inputPerM +
    (usage.outputTokens / 1_000_000) * rates.outputPerM
  );
}

export function currentCost(): RunCost {
  return {
    generator: { ...generator },
    judge: { ...judge },
    totalUsd:
      usdFor(generator, PRICING.generator) + usdFor(judge, PRICING.judge),
  };
}

/** Test-only: reset the counters between report unit tests. */
export function resetMeter(): void {
  generator.calls = generator.inputTokens = generator.outputTokens = 0;
  judge.calls = judge.inputTokens = judge.outputTokens = 0;
}

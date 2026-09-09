// `npm run eval:report` — merges the per-task result shards into the committed
// RESULTS.md, and snapshots the raw outputs alongside it.
//
// The raw snapshot is deliberate. A summary document that cannot be checked
// against the runs behind it is an assertion, not evidence; committing the actual
// per-case model outputs is what makes the report falsifiable by anyone reading
// the repo.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EvalRunResults } from "./runner";
import { renderResults, truncatedRuns } from "./report";
import { promptFingerprint } from "./fingerprint";

const EVALS_DIR = path.resolve(__dirname, "..");
const RESULTS_DIR = path.join(EVALS_DIR, "results");
const BASELINE_DIR = path.join(EVALS_DIR, "baseline");

// Task order in the report: the safety-critical surface first, then the north
// star, then the rest. Anything unlisted sorts to the end alphabetically.
const TASK_ORDER = [
  "preferences-talk",
  "plan-generate",
  "plan-modify",
  "ingredient-normalize",
  "normalize-equivalence",
  "recipe-generate",
];

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: EVALS_DIR })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function loadRuns(mode: "real" | "mock"): EvalRunResults[] {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(`.${mode}.json`))
    .map((f) => JSON.parse(readFileSync(path.join(RESULTS_DIR, f), "utf8")) as EvalRunResults)
    .sort((a, b) => {
      const ai = TASK_ORDER.indexOf(a.task);
      const bi = TASK_ORDER.indexOf(b.task);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.task.localeCompare(b.task);
    });
}

function main(): void {
  const runs = loadRuns("real");
  if (runs.length === 0) {
    console.error(
      "No real-model results found in evals/results/. Run `npm run eval` first."
    );
    process.exit(1);
  }

  // A filtered run (`npm run eval:task -t …`) leaves shards for only the tasks it
  // touched, and a shard holding only the cases that matched the filter. Either
  // one would put a confident summary over a partial measurement.
  //
  // The truncation check is the load-bearing one: a missing task is obvious in the
  // report, while a task quietly reporting 1 of its 8 cases is not. That happened —
  // a negative-control run overwrote a shard and the committed report silently
  // described 44 cases instead of 51.
  const truncated = truncatedRuns(runs);
  if (truncated.length > 0) {
    console.error("⛔ Refusing to write a report from a filtered run.\n");
    for (const r of truncated) {
      console.error(`   ${r.task}: ${r.cases.length} of ${r.definedCases} cases ran`);
    }
    console.error("\n   Run `npm run eval` for a full run before regenerating the report.");
    process.exit(1);
  }

  const missing = TASK_ORDER.filter((task) => !runs.some((r) => r.task === task));
  if (missing.length > 0) {
    console.warn(
      `⚠️  Partial run: no results for ${missing.join(", ")}.\n` +
        "   RESULTS.md will describe only the tasks that ran. Use `npm run eval` for a full run."
    );
  }

  const commit = currentCommit();
  const markdown = renderResults(runs, {
    commit,
    promptsHash: promptFingerprint(),
    generatedAt: new Date().toISOString().slice(0, 10),
  });

  writeFileSync(path.join(EVALS_DIR, "RESULTS.md"), `${markdown}\n`);

  // One file, replaced each run rather than one per commit: this is ~500KB of raw
  // model output, and accumulating a copy per eval run would bloat the repo for no
  // extra evidence. Which commit it describes is recorded inside it and in
  // RESULTS.md; git history holds the older ones.
  mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(
    path.join(BASELINE_DIR, "latest.json"),
    `${JSON.stringify({ commit, generatedAt: new Date().toISOString(), runs }, null, 2)}\n`
  );

  const failures = runs.flatMap((r) =>
    r.cases.filter((c) => c.gate?.reproduced).map((c) => `${r.task}: ${c.name}`)
  );

  console.log(`Wrote evals/RESULTS.md and evals/baseline/latest.json (${commit})`);
  if (failures.length) {
    console.error(`\n${failures.length} confirmed must-hold failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main();

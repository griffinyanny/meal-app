// `npx tsx evals/harness/calibrate.ts` — samples judged observations for a human
// audit of the judge.
//
// A judge is a measurement instrument, and an instrument nobody has checked
// against a known standard produces numbers, not evidence. This prints a sample
// of what the judge graded, WITHOUT showing its verdict, so a person can label
// each one blind. Pass the labels back with --score to get agreement.
//
// Nothing here writes into the repo. An empty calibration section committed to a
// public README would be worse than no claim at all, so the numbers only land in
// evals/README.md once real labels exist.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { EvalRunResults } from "./runner";

const RESULTS_DIR = path.resolve(__dirname, "..", "results");

interface JudgedItem {
  id: string;
  task: string;
  caseName: string;
  question: string;
  output: string;
  judgeVerdict: boolean;
  judgeReasoning: string;
}

function collect(): JudgedItem[] {
  if (!existsSync(RESULTS_DIR)) return [];
  const items: JudgedItem[] = [];
  for (const file of readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".real.json"))) {
    const run = JSON.parse(
      readFileSync(path.join(RESULTS_DIR, file), "utf8")
    ) as EvalRunResults;
    for (const c of run.cases) {
      for (const observation of c.observations) {
        for (const check of observation.checks) {
          if (check.kind !== "judged" || check.skipped) continue;
          items.push({
            id: `${run.task}:${c.name.slice(0, 20)}:${observation.index}`,
            task: run.task,
            caseName: c.name,
            question: check.name,
            output: JSON.stringify(observation.output, null, 1),
            judgeVerdict: check.passed,
            judgeReasoning: check.detail ?? "",
          });
        }
      }
    }
  }
  return items;
}

/** Spread the sample across questions so one chatty case cannot dominate it. */
function sample(items: JudgedItem[], n: number): JudgedItem[] {
  const byQuestion = new Map<string, JudgedItem[]>();
  for (const item of items) {
    const list = byQuestion.get(item.question) ?? [];
    list.push(item);
    byQuestion.set(item.question, list);
  }
  const picked: JudgedItem[] = [];
  let round = 0;
  while (picked.length < n) {
    let added = false;
    for (const list of byQuestion.values()) {
      if (round < list.length && picked.length < n) {
        picked.push(list[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return picked;
}

export interface Agreement {
  n: number;
  agreed: number;
  /** Of the items a human passed, the share the judge also passed. */
  truePositiveRate: number | null;
  /** Of the items a human failed, the share the judge also failed. */
  trueNegativeRate: number | null;
}

export function scoreAgreement(
  items: { judgeVerdict: boolean; humanVerdict: boolean }[]
): Agreement {
  const humanPass = items.filter((i) => i.humanVerdict);
  const humanFail = items.filter((i) => !i.humanVerdict);
  return {
    n: items.length,
    agreed: items.filter((i) => i.judgeVerdict === i.humanVerdict).length,
    truePositiveRate: humanPass.length
      ? humanPass.filter((i) => i.judgeVerdict).length / humanPass.length
      : null,
    trueNegativeRate: humanFail.length
      ? humanFail.filter((i) => !i.judgeVerdict).length / humanFail.length
      : null,
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const scoreIndex = args.indexOf("--score");

  if (scoreIndex !== -1) {
    // --score pass,fail,pass,... in the same order the sample was printed.
    const labels = (args[scoreIndex + 1] ?? "").split(",").map((s) => s.trim().toLowerCase());
    const items = sample(collect(), labels.length);
    if (items.length !== labels.length) {
      console.error(`Got ${labels.length} labels but ${items.length} sampled items.`);
      process.exit(1);
    }
    const scored = items.map((item, i) => ({
      judgeVerdict: item.judgeVerdict,
      humanVerdict: labels[i] === "pass" || labels[i] === "p" || labels[i] === "y",
    }));
    const agreement = scoreAgreement(scored);
    console.log(JSON.stringify(agreement, null, 2));
    items.forEach((item, i) => {
      const human = scored[i].humanVerdict;
      const mark = human === item.judgeVerdict ? "agree" : "DISAGREE";
      console.log(
        `${mark}  human=${human ? "pass" : "fail"} judge=${item.judgeVerdict ? "pass" : "fail"}  ${item.question}`
      );
    });
    return;
  }

  const n = Number(args[0] ?? 10);
  const items = sample(collect(), n);
  if (items.length === 0) {
    console.error("No judged observations found. Run `npm run eval` first.");
    process.exit(1);
  }

  console.log(
    `${items.length} judged outputs, judge verdicts hidden. Label each pass or fail.\n`
  );
  items.forEach((item, i) => {
    console.log(`── ${i + 1} ──────────────────────────────────────────────`);
    console.log(`QUESTION: ${item.question}`);
    console.log(`CASE: ${item.caseName}`);
    console.log(`OUTPUT:\n${item.output}`);
    console.log("");
  });
  console.log(
    "Score with:  npx tsx evals/harness/calibrate.ts --score pass,fail,pass,..."
  );
}

if (require.main === module) main();

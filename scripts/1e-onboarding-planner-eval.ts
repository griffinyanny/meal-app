// Phase 1E — deep-round stopping-policy eval (feature #4).
//
// Griffin's ask: "keep probing as far as someone will go, but don't exhaust
// them." That's a tuning problem, not a constant, so this script is how we tune
// it: it drives the planner through simulated cooks and reports what each one
// experienced. Change DEFAULT_STOPPING_POLICY in src/lib/onboarding/planner.ts,
// re-run, and read the table.
//
// Costs nothing and needs no network — the planner is deterministic by design
// (see the rationale at the top of planner.ts), which is exactly what makes an
// eval like this meaningful rather than a sample of one model's mood.
//
// Run:  npx tsx scripts/1e-onboarding-planner-eval.ts
import {
  DEFAULT_STOPPING_POLICY,
  buildDeepAnswer,
  isLowSignal,
  planNextQuestion,
  type StopReason,
  type StoppingPolicy,
} from "../src/lib/onboarding/planner";
import { DEEP_QUESTIONS } from "../src/lib/onboarding/questions";
import { emptyInterviewState, type InterviewState } from "../src/lib/onboarding/types";

// A simulated cook: how they answer whatever they're asked.
interface Persona {
  name: string;
  note: string;
  seed?: Partial<InterviewState>;
  // Returns the option values chosen; [] means they skipped the question.
  answer: (questionId: string, turn: number) => string[];
  // What we expect of the experience for this persona.
  expect: {
    minQuestions: number;
    maxQuestions: number;
    stopReason?: StopReason;
  };
}

function firstRealOption(questionId: string): string[] {
  const q = DEEP_QUESTIONS.find((x) => x.id === questionId)!;
  return [q.options.find((o) => o.value !== "nothing")!.value];
}

const PERSONAS: Persona[] = [
  {
    name: "Engaged",
    note: "answers everything; should be stopped BY US, not by boredom",
    // Seeded with a 45-minute ceiling so the `effort` question is in play. A
    // 30-minute cook has already answered it, and the bank suppresses it.
    seed: { maxCookTimeWeeknight: 45 },
    answer: (id) => firstRealOption(id),
    expect: { minQuestions: 5, maxQuestions: 5 },
  },
  {
    name: "Fast cook",
    note: "30-minute ceiling; must not be asked how ambitious a weeknight should get",
    seed: { maxCookTimeWeeknight: 30 },
    answer: (id) => firstRealOption(id),
    expect: { minQuestions: 5, maxQuestions: 5 },
  },
  {
    name: "Terse",
    note: "skips immediately; must not be dragged through the full bank",
    answer: () => [],
    expect: { minQuestions: 2, maxQuestions: 2, stopReason: "disengaged" },
  },
  {
    name: "Fades",
    note: "engages, then goes quiet; we should notice and stop",
    answer: (id, turn) => (turn < 2 ? firstRealOption(id) : []),
    expect: { minQuestions: 4, maxQuestions: 4, stopReason: "disengaged" },
  },
  {
    name: "Front-loaded",
    note: "said it all in free text; must not be re-asked what it knows",
    seed: {
      cuisinePreferences: ["Thai", "Mexican"],
      freeTextDimensions: ["heat", "proteins"],
    },
    answer: (id) => firstRealOption(id),
    expect: { minQuestions: 3, maxQuestions: 5 },
  },
  {
    name: "Vegan",
    note: "protein question does not apply; bank must adapt",
    seed: { dietaryFramework: "vegan" },
    answer: (id) => firstRealOption(id),
    expect: { minQuestions: 4, maxQuestions: 5 },
  },
  {
    name: "Noncommittal",
    note: "answers, but with 'nothing specific' — low signal is still low signal",
    answer: (id) => {
      const q = DEEP_QUESTIONS.find((x) => x.id === id)!;
      return q.options.some((o) => o.value === "nothing")
        ? ["nothing"]
        : firstRealOption(id);
    },
    expect: { minQuestions: 2, maxQuestions: 5 },
  },
];

interface Run {
  asked: string[];
  stopReason: StopReason;
  captured: number;
}

function run(persona: Persona, policy: StoppingPolicy): Run {
  let state: InterviewState = { ...emptyInterviewState(), ...persona.seed };
  const asked: string[] = [];

  for (;;) {
    const result = planNextQuestion(state, policy);
    if (result.kind === "stop") {
      return {
        asked,
        stopReason: result.reason,
        captured: state.deepAnswers.filter((a) => !isLowSignal(a)).length,
      };
    }
    const values = persona.answer(result.question.id, asked.length);
    asked.push(result.question.id);
    state = {
      ...state,
      deepAnswers: [...state.deepAnswers, buildDeepAnswer(result.question, values)],
    };
  }
}

function main(): void {
  const policy = DEFAULT_STOPPING_POLICY;
  console.log("Deep-round stopping policy eval");
  console.log("policy:", JSON.stringify(policy), "\n");

  let failures = 0;

  for (const persona of PERSONAS) {
    const result = run(persona, policy);
    const n = result.asked.length;

    const problems: string[] = [];
    if (n < persona.expect.minQuestions)
      problems.push(`asked ${n}, expected >= ${persona.expect.minQuestions}`);
    if (n > persona.expect.maxQuestions)
      problems.push(`asked ${n}, expected <= ${persona.expect.maxQuestions}`);
    if (persona.expect.stopReason && result.stopReason !== persona.expect.stopReason)
      problems.push(`stopped "${result.stopReason}", expected "${persona.expect.stopReason}"`);

    // Universal invariants, checked for every persona.
    if (new Set(result.asked).size !== n) problems.push("asked a question twice");
    if (n > policy.maxQuestions) problems.push("exceeded the hard cap");
    // The value meter divides by meterTarget, so if a fully engaged cook stops
    // short of it the bar can never fill and the meter quietly lies. Checked
    // here rather than trusted to a comment.
    if (persona.name === "Engaged" && n !== policy.meterTarget)
      problems.push(`engaged cook reached ${n}, but meterTarget is ${policy.meterTarget}`);
    // A suppressed question must never be asked, however the scores land.
    for (const id of result.asked) {
      const q = DEEP_QUESTIONS.find((x) => x.id === id)!;
      const seeded: InterviewState = { ...emptyInterviewState(), ...persona.seed };
      if (q.appliesTo && !q.appliesTo(seeded))
        problems.push(`asked "${id}", which does not apply to this cook`);
    }

    const seededFreeText = persona.seed?.freeTextDimensions ?? [];
    for (const id of result.asked) {
      const q = DEEP_QUESTIONS.find((x) => x.id === id)!;
      if (seededFreeText.includes(q.dimension))
        problems.push(`re-asked "${id}", already covered in free text`);
      if (persona.seed?.cuisinePreferences?.length && q.dimension === "cuisines")
        problems.push("re-asked cuisines the user already gave");
    }

    const ok = problems.length === 0;
    if (!ok) failures++;

    console.log(`${ok ? "PASS" : "FAIL"}  ${persona.name.padEnd(13)} ${persona.note}`);
    console.log(
      `      asked ${n} (${result.asked.join(" > ") || "none"}), captured ${result.captured}, stop: ${result.stopReason}`
    );
    for (const p of problems) console.log(`      ! ${p}`);
    console.log();
  }

  console.log(`${PERSONAS.length - failures}/${PERSONAS.length} personas passed`);
  if (failures > 0) process.exitCode = 1;
}

main();

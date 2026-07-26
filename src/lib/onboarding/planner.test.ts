import { describe, it, expect } from "vitest";
import {
  DEFAULT_STOPPING_POLICY,
  buildDeepAnswer,
  isLowSignal,
  planNextQuestion,
  scoreQuestion,
  valueMeterProgress,
} from "./planner";
import { DEEP_QUESTIONS } from "./questions";
import { emptyInterviewState, type InterviewState } from "./types";

function questionById(id: string) {
  const q = DEEP_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`no question ${id}`);
  return q;
}

// Answers a question with its first real option, the way an engaged user would.
function answer(state: InterviewState, id: string): InterviewState {
  const q = questionById(id);
  const value = q.options.find((o) => o.value !== "nothing")!.value;
  return {
    ...state,
    deepAnswers: [...state.deepAnswers, buildDeepAnswer(q, [value])],
  };
}

// Skips a question — the low-signal turn the disengagement rule watches for.
function skip(state: InterviewState, id: string): InterviewState {
  return {
    ...state,
    deepAnswers: [...state.deepAnswers, buildDeepAnswer(questionById(id), [])],
  };
}

describe("planNextQuestion", () => {
  it("should open the deep round with the highest-value question", () => {
    const result = planNextQuestion(emptyInterviewState());
    expect(result.kind).toBe("ask");
    if (result.kind !== "ask") return;
    expect(result.question.id).toBe("heat");
  });

  it("should never ask the same question twice", () => {
    let state = emptyInterviewState();
    const asked: string[] = [];
    for (let i = 0; i < DEFAULT_STOPPING_POLICY.maxQuestions; i++) {
      const result = planNextQuestion(state);
      if (result.kind !== "ask") break;
      asked.push(result.question.id);
      state = answer(state, result.question.id);
    }
    expect(new Set(asked).size).toBe(asked.length);
  });

  it("should stop at the hard cap even for a fully engaged user", () => {
    let state = emptyInterviewState();
    for (let i = 0; i < 20; i++) {
      const result = planNextQuestion(state);
      if (result.kind !== "ask") break;
      state = answer(state, result.question.id);
    }
    expect(state.deepAnswers.length).toBeLessThanOrEqual(
      DEFAULT_STOPPING_POLICY.maxQuestions
    );
    expect(planNextQuestion(state).kind).toBe("stop");
  });

  it("should stop early when the user skips consecutive questions", () => {
    let state = emptyInterviewState();
    const first = planNextQuestion(state);
    if (first.kind !== "ask") throw new Error("expected a question");
    state = skip(state, first.question.id);
    const second = planNextQuestion(state);
    if (second.kind !== "ask") throw new Error("expected a second question");
    state = skip(state, second.question.id);

    const result = planNextQuestion(state);
    expect(result).toEqual({ kind: "stop", reason: "disengaged" });
    expect(state.deepAnswers.length).toBeLessThan(DEFAULT_STOPPING_POLICY.maxQuestions);
  });

  it("should keep going when a skip is followed by a real answer", () => {
    let state = emptyInterviewState();
    const first = planNextQuestion(state);
    if (first.kind !== "ask") throw new Error("expected a question");
    state = skip(state, first.question.id);
    const second = planNextQuestion(state);
    if (second.kind !== "ask") throw new Error("expected a second question");
    state = answer(state, second.question.id);

    expect(planNextQuestion(state).kind).toBe("ask");
  });

  it("should not ask about cuisines the user already gave in free text", () => {
    const state: InterviewState = {
      ...emptyInterviewState(),
      cuisinePreferences: ["Thai", "Mexican"],
    };
    expect(scoreQuestion(questionById("cuisines"), state)).toBe(0);
  });

  it("should not ask about a dimension the user already covered in their own words", () => {
    const state: InterviewState = {
      ...emptyInterviewState(),
      freeTextDimensions: ["heat"],
    };
    expect(scoreQuestion(questionById("heat"), state)).toBe(0);
    const result = planNextQuestion(state);
    if (result.kind !== "ask") throw new Error("expected a question");
    expect(result.question.id).not.toBe("heat");
  });

  it("should skip the protein question for a vegan, where too few options remain", () => {
    const state: InterviewState = {
      ...emptyInterviewState(),
      dietaryFramework: "vegan",
    };
    expect(scoreQuestion(questionById("proteins"), state)).toBe(0);
  });

  it("should offer a pescatarian fish but not beef", () => {
    const state: InterviewState = {
      ...emptyInterviewState(),
      dietaryFramework: "pescatarian",
    };
    const options = questionById("proteins").optionsFor!(state).map((o) => o.value);
    expect(options).toContain("fish");
    expect(options).not.toContain("beef");
  });

  it("should stop with bank_exhausted when every question has been covered", () => {
    let state = emptyInterviewState();
    for (const q of DEEP_QUESTIONS) state = answer(state, q.id);
    const generous = { ...DEFAULT_STOPPING_POLICY, maxQuestions: 99, minValue: 0 };
    expect(planNextQuestion(state, generous)).toEqual({
      kind: "stop",
      reason: "bank_exhausted",
    });
  });

  it("should stop on low value once fatigue outweighs the remaining questions", () => {
    let state = emptyInterviewState();
    // No cap and no disengagement rule: low_value must be what ends it.
    const policy = {
      ...DEFAULT_STOPPING_POLICY,
      maxQuestions: 99,
      lowSignalStop: 99,
    };
    let last = planNextQuestion(state, policy);
    while (last.kind === "ask") {
      state = answer(state, last.question.id);
      last = planNextQuestion(state, policy);
    }
    expect(last.reason).toBe("low_value");
  });
});

describe("isLowSignal", () => {
  it("should treat a skipped question as low signal", () => {
    expect(isLowSignal(buildDeepAnswer(questionById("heat"), []))).toBe(true);
  });

  it("should treat 'nothing specific' as low signal", () => {
    expect(isLowSignal(buildDeepAnswer(questionById("goal"), ["nothing"]))).toBe(true);
  });

  it("should treat a real choice as signal", () => {
    expect(isLowSignal(buildDeepAnswer(questionById("heat"), ["hot"]))).toBe(false);
  });
});

describe("valueMeterProgress", () => {
  it("should start empty", () => {
    expect(valueMeterProgress(emptyInterviewState())).toBe(0);
  });

  it("should not fill for skipped questions, which taught the chef nothing", () => {
    const state = skip(emptyInterviewState(), "heat");
    expect(valueMeterProgress(state)).toBe(0);
  });

  it("should fill as real answers land", () => {
    const state = answer(emptyInterviewState(), "heat");
    expect(valueMeterProgress(state)).toBeGreaterThan(0);
  });

  it("should never exceed one", () => {
    let state = emptyInterviewState();
    for (const q of DEEP_QUESTIONS) state = answer(state, q.id);
    expect(valueMeterProgress(state)).toBe(1);
  });

  it("should reach full for a cook who answered everything they were offered", () => {
    // The meter used to divide by the hard cap, which the policy never reaches,
    // so the most engaged user possible topped out at 80% and was told they'd
    // left something undone. It now measures against meterTarget.
    let state: InterviewState = {
      ...emptyInterviewState(),
      maxCookTimeWeeknight: 45,
    };
    for (;;) {
      const result = planNextQuestion(state);
      if (result.kind === "stop") break;
      state = answer(state, result.question.id);
    }
    expect(valueMeterProgress(state)).toBe(1);
  });
});

describe("the effort question's overlap with the core round", () => {
  it("should not ask how ambitious a weeknight should get when the ceiling is 30 minutes", () => {
    // "30 minutes, tops" has already answered it. Asking anyway is the same
    // failure the planner refuses for free-text dimensions.
    let state: InterviewState = {
      ...emptyInterviewState(),
      maxCookTimeWeeknight: 30,
    };
    const asked: string[] = [];
    for (;;) {
      const result = planNextQuestion(state);
      if (result.kind === "stop") break;
      asked.push(result.question.id);
      state = answer(state, result.question.id);
    }
    expect(asked).not.toContain("effort");
  });

  it("should still ask it when the cook gave themselves real room", () => {
    let state: InterviewState = {
      ...emptyInterviewState(),
      maxCookTimeWeeknight: 75,
      // Two higher-ranked questions already covered in the user's own words, so
      // effort is genuinely in reach rather than crowded out by score alone.
      cuisinePreferences: ["Thai"],
      freeTextDimensions: ["heat", "proteins"],
    };
    const asked: string[] = [];
    for (;;) {
      const result = planNextQuestion(state);
      if (result.kind === "stop") break;
      asked.push(result.question.id);
      state = answer(state, result.question.id);
    }
    expect(asked).toContain("effort");
  });
});

import { describe, it, expect } from "vitest";
import {
  planSeedChips,
  planSeedRequest,
  reflectHook,
  reflectSummary,
  synthesizeHeadlineMemory,
  synthesizeMemories,
} from "./synthesize";
import { buildDeepAnswer } from "./planner";
import { DEEP_QUESTIONS } from "./questions";
import { emptyInterviewState, type InterviewState } from "./types";

function withAnswer(state: InterviewState, id: string, values: string[]): InterviewState {
  const q = DEEP_QUESTIONS.find((x) => x.id === id)!;
  return { ...state, deepAnswers: [...state.deepAnswers, buildDeepAnswer(q, values)] };
}

const coreState: InterviewState = {
  ...emptyInterviewState(),
  composition: { adults: 2, children: 1, babies: 0, babyStage: null },
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  maxCookTimeWeeknight: 30,
};

describe("synthesizeHeadlineMemory", () => {
  it("should summarize household, diet, and time in one chef-voiced sentence", () => {
    const memory = synthesizeHeadlineMemory(coreState);
    expect(memory).toContain("2 adults and 1 child");
    expect(memory).toContain("pescatarian");
    expect(memory).toContain("30 minutes");
  });

  it("should omit the diet clause for an omnivore, which says nothing", () => {
    const memory = synthesizeHeadlineMemory({
      ...coreState,
      dietaryFramework: "omnivore",
    });
    expect(memory).not.toContain("omnivore");
  });

  it("should write an honest memory when the user answered nothing at all", () => {
    const memory = synthesizeHeadlineMemory(emptyInterviewState());
    expect(memory).toContain("Skipped");
    expect(memory.length).toBeGreaterThan(0);
  });
});

describe("synthesizeMemories", () => {
  it("should always write at least one memory, even for a tap-only run", () => {
    expect(synthesizeMemories(coreState).length).toBeGreaterThanOrEqual(1);
  });

  it("should add one memory per deep answer that carried signal", () => {
    const state = withAnswer(coreState, "heat", ["hot"]);
    const memories = synthesizeMemories(state);
    expect(memories).toHaveLength(2);
    expect(memories[1].content).toContain("heat");
  });

  it("should not write a memory for a skipped deep question", () => {
    const state = withAnswer(coreState, "heat", []);
    expect(synthesizeMemories(state)).toHaveLength(1);
  });

  it("should not write a memory for an explicit 'nothing specific'", () => {
    const state = withAnswer(coreState, "goal", ["nothing"]);
    expect(synthesizeMemories(state)).toHaveLength(1);
  });

  it("should file shopping cadence as a behavior rather than a preference", () => {
    const state = withAnswer(coreState, "shopping", ["weekly"]);
    const shopping = synthesizeMemories(state).find((m) => m.content.includes("Shops"));
    expect(shopping?.category).toBe("behavior");
  });
});

describe("reflectHook", () => {
  it("should react like a cook with a dish in mind, not a receipt", () => {
    const state = withAnswer(coreState, "heat", ["hot"]);
    expect(reflectHook(state)).toContain("chili-crisp");
  });

  it("should speak to the constraint when weeknights are very short", () => {
    const hook = reflectHook({ ...coreState, maxCookTimeWeeknight: 20 });
    expect(hook).toContain("Twenty minutes");
  });

  it("should speak to the baby when there is one", () => {
    const hook = reflectHook({
      ...emptyInterviewState(),
      composition: { adults: 2, children: 0, babies: 1, babyStage: "6_to_12m" },
    });
    expect(hook).toContain("little one");
  });

  it("should always return something for an empty interview", () => {
    expect(reflectHook(emptyInterviewState()).length).toBeGreaterThan(0);
  });
});

describe("reflectSummary", () => {
  it("should read back what the chef will cook around", () => {
    const summary = reflectSummary(coreState);
    expect(summary).toContain("2 adults and 1 child");
    expect(summary).toContain("30 minutes");
  });

  it("should be honest when nothing was captured", () => {
    expect(reflectSummary(emptyInterviewState())).toContain("safe and simple");
  });
});

describe("planSeedChips", () => {
  it("should surface the constraints the plan was pre-filled from", () => {
    const chips = planSeedChips({ ...coreState, cuisinePreferences: ["Thai"] });
    expect(chips).toContain("pescatarian");
    expect(chips).toContain("Under 30 min");
    expect(chips).toContain("Thai");
    expect(chips).toContain("Kid-friendly");
  });

  it("should strip the allergy marker from a restriction chip", () => {
    const chips = planSeedChips(coreState);
    expect(chips).toContain("No shellfish");
    expect(chips.join(" ")).not.toContain("(allergy)");
  });

  it("should stay within a readable number of chips", () => {
    const chips = planSeedChips({
      ...coreState,
      cuisinePreferences: ["Thai", "Italian", "Mexican", "Indian"],
      restrictions: ["shellfish (allergy)", "pork", "dairy"],
    });
    expect(chips.length).toBeLessThanOrEqual(6);
  });

  it("should return nothing to show for an empty interview", () => {
    expect(planSeedChips(emptyInterviewState())).toEqual([]);
  });
});

describe("planSeedRequest", () => {
  it("should be undefined when the interview learned nothing to steer with", () => {
    expect(planSeedRequest(emptyInterviewState())).toBeUndefined();
  });

  it("should fold cuisines, proteins, and heat into one request sentence", () => {
    let state: InterviewState = { ...coreState, cuisinePreferences: ["Thai"] };
    state = withAnswer(state, "heat", ["hot"]);
    state = withAnswer(state, "proteins", ["fish"]);
    const request = planSeedRequest(state);
    expect(request).toContain("Thai");
    expect(request).toContain("fish");
    expect(request).toContain("real heat");
  });

  it("should ignore a 'nothing specific' goal", () => {
    const state = withAnswer(coreState, "goal", ["nothing"]);
    expect(planSeedRequest(state)).toBeUndefined();
  });
});

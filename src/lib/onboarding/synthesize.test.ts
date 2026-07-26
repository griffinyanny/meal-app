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
  it("should react like a cook with a point of view, not a receipt", () => {
    const state = withAnswer(coreState, "heat", ["hot"]);
    expect(reflectHook(state)).toContain("chili crisp");
  });

  it("should name a technique or ingredient rather than a specific plate", () => {
    // The register rule (S39): nothing carries this line into generation, so a
    // named plate is a promise the plan has no idea it made. Guarding the two
    // dishes the hooks used to name, because the failure is invisible in code
    // review and only shows up as a first plan that contradicts the first thing
    // the chef said.
    const banned = ["seared salmon", "short-rib", "pork chop"];
    const states: InterviewState[] = [
      withAnswer(coreState, "heat", ["hot"]),
      coreState,
      { ...coreState, maxCookTimeWeeknight: 75 },
      { ...coreState, dietaryFramework: "vegan" },
    ];
    for (const state of states) {
      const hook = reflectHook(state).toLowerCase();
      for (const phrase of banned) expect(hook).not.toContain(phrase);
    }
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

  it("should still name a dish when the user only answered the core questions", () => {
    // The most common completion there is: four taps, no deep round. It must
    // not fall through to the generic "I've got enough" line.
    const hook = reflectHook(coreState);
    expect(hook).not.toContain("enough to build you a week");
    expect(hook.toLowerCase()).toContain("fish");
  });

  it("should never name a food the user just said to avoid", () => {
    const hook = reflectHook({
      ...coreState,
      restrictions: ["fish (allergy)"],
    });
    expect(hook.toLowerCase()).not.toContain("fish");
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
    // Capitalized: it's a label sitting beside "Under 30 min", not a sentence
    // fragment.
    expect(chips).toContain("Pescatarian");
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
    // The core floor still applies, so the request exists — it just carries
    // nothing the user declined to say.
    expect(planSeedRequest(state)).not.toContain("Working toward");
    expect(planSeedRequest(state)).toBe(planSeedRequest(coreState));
  });

  it("should still steer the first plan when the deep round was declined", () => {
    // The most common completion: four core taps, no deep answers. This used to
    // return undefined and hand off an empty box, so the interview's own
    // hand-off screen fed nothing into the generation it introduced.
    const request = planSeedRequest(coreState);
    expect(request).toBeDefined();
    expect(request).toContain("30 minutes");
  });

  it("should let a deep answer replace the core floor rather than stack on it", () => {
    const state = withAnswer(coreState, "heat", ["hot"]);
    expect(planSeedRequest(state)).toContain("real heat");
    expect(planSeedRequest(state)).not.toContain("30 minutes");
  });
});

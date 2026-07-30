import { describe, it, expect } from "vitest";
import { buildPlanStreamParams } from "./generate-plan";

// A WEDNESDAY start. Deliberately not a Monday: the day map exists because the
// model assumed Monday and mislabelled every card on a week like this one.
const WEEK_START = "2026-07-29";

describe("buildPlanStreamParams", () => {
  it("should target the plan-generate task with the plan schema", () => {
    const params = buildPlanStreamParams({ weekStart: WEEK_START, request: "Healthy dinners" });

    expect(params.task).toBe("plan-generate");
    expect(params.schema).toBeDefined();
    expect(params.system).toContain("weekly plan");
  });

  it("should wrap the user's request in a delimiter in the user message", () => {
    const params = buildPlanStreamParams({ weekStart: WEEK_START, request: "Grill all weekend" });

    expect(params.prompt).toContain("<user_request>");
    expect(params.prompt).toContain("Grill all weekend");
    // The request must never enter the static system prompt.
    expect(params.system).not.toContain("Grill all weekend");
  });

  it("should use a surprise-me prompt when no request is given", () => {
    const params = buildPlanStreamParams({ weekStart: WEEK_START });

    expect(params.prompt).toContain("surprise them");
    expect(params.prompt).not.toContain("<user_request>");
  });

  it("should pass dietary context and memories in the user message, not the system prompt", () => {
    const params = buildPlanStreamParams({
      weekStart: WEEK_START,
      request: "A normal week",
      dietaryFramework: "pescatarian",
      dislikedFoods: ["mushrooms"],
      memories: ["Hates cilantro"],
    });

    expect(params.prompt).toContain("<user_context>");
    expect(params.prompt).toContain("mushrooms");
    expect(params.prompt).toContain("Hates cilantro");
    expect(params.system).not.toContain("mushrooms");
    expect(params.system).not.toContain("Hates cilantro");
  });

  it("should name every weekday of the actual week, not a Monday-start week", () => {
    // The S45 Layer-B defect, locked. The week below starts on a WEDNESDAY, and
    // before this map existed the model resolved dayOffset 1 to "Tuesday" and
    // printed "Brighten Tuesday" onto the Thursday card. Asserting the whole
    // map rather than one line, because the failure was systematic — every day
    // was wrong, not one — and asserting Monday's true position is what proves
    // the map is real dates rather than the conventional ordering.
    const params = buildPlanStreamParams({ weekStart: WEEK_START });

    expect(params.prompt).toContain("dayOffset 0 is Wednesday, July 29");
    expect(params.prompt).toContain("dayOffset 1 is Thursday, July 30");
    expect(params.prompt).toContain("dayOffset 2 is Friday, July 31");
    expect(params.prompt).toContain("dayOffset 3 is Saturday, August 1");
    expect(params.prompt).toContain("dayOffset 4 is Sunday, August 2");
    expect(params.prompt).toContain("dayOffset 5 is Monday, August 3");
    expect(params.prompt).toContain("dayOffset 6 is Tuesday, August 4");
    expect(params.prompt).toContain("does NOT start on Monday");
  });

  it("should keep the day map out of the static system prompt", () => {
    // buildPlanSystemPrompt is asserted static elsewhere; this is the other
    // half — per-week data must ride in the user message or that guarantee
    // silently becomes false.
    const params = buildPlanStreamParams({ weekStart: WEEK_START });

    expect(params.system).not.toContain("dayOffset 0 is");
  });
});

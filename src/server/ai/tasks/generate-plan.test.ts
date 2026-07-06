import { describe, it, expect } from "vitest";
import { buildPlanStreamParams } from "./generate-plan";

describe("buildPlanStreamParams", () => {
  it("should target the plan-generate task with the plan schema", () => {
    const params = buildPlanStreamParams({ request: "Healthy dinners" });

    expect(params.task).toBe("plan-generate");
    expect(params.schema).toBeDefined();
    expect(params.system).toContain("weekly plan");
  });

  it("should wrap the user's request in a delimiter in the user message", () => {
    const params = buildPlanStreamParams({ request: "Grill all weekend" });

    expect(params.prompt).toContain("<user_request>");
    expect(params.prompt).toContain("Grill all weekend");
    // The request must never enter the static system prompt.
    expect(params.system).not.toContain("Grill all weekend");
  });

  it("should use a surprise-me prompt when no request is given", () => {
    const params = buildPlanStreamParams({});

    expect(params.prompt).toContain("surprise them");
    expect(params.prompt).not.toContain("<user_request>");
  });

  it("should pass dietary context and memories in the user message, not the system prompt", () => {
    const params = buildPlanStreamParams({
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
});

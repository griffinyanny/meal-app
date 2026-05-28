import { describe, it, expect, vi, beforeEach } from "vitest";
import { modifyRecipe } from "./modify-recipe";
import * as aiModule from "@/server/ai";

vi.mock("@/server/ai", () => ({
  generateStructured: vi.fn(),
}));

const mockGenerateStructured = vi.mocked(aiModule.generateStructured);

const modifiedRecipe = {
  title: "Dairy-Free Chicken Alfredo",
  description: "Creamy alfredo made with cashew cream instead of dairy",
  servings: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  totalTimeMinutes: 35,
  ingredients: [
    { qty: "1", unit: "lb", item: "fettuccine" },
    { qty: "1", unit: "cup", item: "cashew cream" },
    { qty: "2", unit: "breasts", item: "chicken", notes: "grilled, sliced" },
  ],
  steps: [
    { number: 1, text: "Cook pasta according to package directions." },
    { number: 2, text: "Blend soaked cashews with garlic and nutritional yeast." },
    { number: 3, text: "Toss pasta with cashew cream and chicken." },
  ],
  tags: ["dairy-free", "pasta"],
};

describe("modifyRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send original recipe and modification request to AI", async () => {
    mockGenerateStructured.mockResolvedValue(modifiedRecipe);

    const result = await modifyRecipe({
      originalTitle: "Chicken Alfredo",
      originalIngredients: [
        { qty: "1", unit: "lb", item: "fettuccine" },
        { qty: "1", unit: "cup", item: "heavy cream" },
      ],
      originalSteps: [
        { number: 1, text: "Cook pasta." },
        { number: 2, text: "Make cream sauce." },
      ],
      originalServings: 4,
      modificationRequest: "Make it dairy-free",
    });

    expect(result.title).toBe(modifiedRecipe.title);
    expect(result.ingredients).toHaveLength(modifiedRecipe.ingredients.length);

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.task).toBe("recipe-modify");
    expect(call.prompt).toContain("Chicken Alfredo");
    expect(call.prompt).toContain("Make it dairy-free");
    expect(call.system).toContain("Recipe modification task");
  });

  it("should pass dietary context in the user message, not the system prompt", async () => {
    mockGenerateStructured.mockResolvedValue(modifiedRecipe);

    await modifyRecipe({
      originalTitle: "Chicken Alfredo",
      originalIngredients: [{ qty: "1", unit: "lb", item: "fettuccine" }],
      originalSteps: [{ number: 1, text: "Cook pasta." }],
      originalServings: 4,
      modificationRequest: "Make it spicier",
      dietaryFramework: "paleo",
      restrictions: ["gluten"],
    });

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.prompt).toContain("paleo");
    expect(call.prompt).toContain("gluten");
    expect(call.system).not.toContain("paleo");
  });

  it("should propagate AI errors", async () => {
    mockGenerateStructured.mockRejectedValue(new Error("Rate limit exceeded"));

    await expect(
      modifyRecipe({
        originalTitle: "Test",
        originalIngredients: [],
        originalSteps: [],
        originalServings: 2,
        modificationRequest: "Change something",
      })
    ).rejects.toThrow("Rate limit exceeded");
  });
});

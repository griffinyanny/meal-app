import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseRecipeUrl } from "./parse-recipe-url";
import * as aiModule from "@/server/ai";

vi.mock("@/server/ai", () => ({
  generateStructured: vi.fn(),
}));

// Hermetic DNS: localhost resolves to loopback (blocked), everything else to a
// public address. IP-literal hosts are checked before DNS, so they bypass this.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) =>
    host === "localhost"
      ? [{ address: "127.0.0.1", family: 4 }]
      : [{ address: "93.184.216.34", family: 4 }]
  ),
}));

const mockGenerateStructured = vi.mocked(aiModule.generateStructured);

const parsedRecipe = {
  title: "Classic Chicken Tikka Masala",
  description: "Creamy, spiced tomato-based curry",
  servings: 4,
  prepTimeMinutes: 20,
  cookTimeMinutes: 30,
  totalTimeMinutes: 50,
  ingredients: [
    { qty: "1.5", unit: "lb", item: "chicken thighs", notes: "boneless" },
    { qty: "1", unit: "cup", item: "yogurt" },
  ],
  steps: [
    { number: 1, text: "Marinate chicken in yogurt and spices for 1 hour." },
    { number: 2, text: "Grill or broil chicken until charred." },
  ],
  tags: ["indian", "curry"],
};

describe("parseRecipeUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: () =>
          Promise.resolve(
            '<html><body><h1>Chicken Tikka Masala</h1><script type="application/ld+json">{"@type":"Recipe","name":"Chicken Tikka Masala"}</script></body></html>'
          ),
      })
    );
  });

  it("should fetch the URL, extract content, and parse via AI", async () => {
    mockGenerateStructured.mockResolvedValue(parsedRecipe);

    const result = await parseRecipeUrl("https://example.com/recipe/tikka");

    expect(result.title).toBe(parsedRecipe.title);
    expect(result.ingredients).toHaveLength(parsedRecipe.ingredients.length);
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "recipe-parse-url",
        prompt: expect.stringContaining("JSON-LD"),
      })
    );
  });

  it("should block private IP addresses (SSRF protection)", async () => {
    await expect(parseRecipeUrl("http://localhost/recipe")).rejects.toThrow(
      "can't be imported"
    );
    await expect(parseRecipeUrl("http://127.0.0.1/recipe")).rejects.toThrow(
      "can't be imported"
    );
    await expect(
      parseRecipeUrl("http://192.168.1.1/recipe")
    ).rejects.toThrow("can't be imported");
    await expect(parseRecipeUrl("http://10.0.0.1/recipe")).rejects.toThrow(
      "can't be imported"
    );
  });

  it("should block non-HTTP protocols", async () => {
    await expect(parseRecipeUrl("file:///etc/passwd")).rejects.toThrow(
      "can't be imported"
    );
    await expect(parseRecipeUrl("ftp://example.com/recipe")).rejects.toThrow(
      "can't be imported"
    );
  });

  it("should fall back to the reader when direct fetch is blocked (403)", async () => {
    mockGenerateStructured.mockResolvedValue(parsedRecipe);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("r.jina.ai")) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ "content-type": "text/plain" }),
            text: () =>
              Promise.resolve(
                "# Chicken Tikka Masala\nIngredients: chicken, yogurt..."
              ),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 403,
          headers: new Headers({ "content-type": "text/html" }),
        });
      })
    );

    const result = await parseRecipeUrl("https://allrecipes.com/blocked");
    expect(result.title).toBe(parsedRecipe.title);
    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.prompt).toContain("markdown");
  });

  it("should error clearly when both direct fetch and reader fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "text/html" }),
      })
    );

    await expect(
      parseRecipeUrl("https://example.com/blocked")
    ).rejects.toThrow("Couldn't read that recipe page");
  });

  it("should reject non-HTML responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/pdf" }),
        text: () => Promise.resolve("binary content"),
      })
    );

    await expect(
      parseRecipeUrl("https://example.com/file.pdf")
    ).rejects.toThrow("doesn't point to a recipe");
  });
});

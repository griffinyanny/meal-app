import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Ingredient, Step } from "@/server/db/schema/recipes";

const MAX_TAGS = 10;

// OpenAI strict structured outputs require every property to be listed in
// `required` and don't support `.optional()`. We use `.nullable()` (field
// always present, may be null) and also avoid min/max/maxItems keywords,
// which strict mode doesn't support. Normalizers below convert the AI's
// nullable output into the clean optional shape stored in the database.

const aiIngredientSchema = z.object({
  qty: z.string(),
  unit: z.string(),
  item: z.string(),
  notes: z.string().nullable(),
  group: z.string().nullable(),
});

const aiStepSchema = z.object({
  number: z.number().int(),
  text: z.string(),
  durationMinutes: z.number().int().nullable(),
  timers: z
    .array(z.object({ label: z.string(), minutes: z.number().int() }))
    .nullable(),
});

export const aiRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().int(),
  prepTimeMinutes: z.number().int(),
  cookTimeMinutes: z.number().int(),
  totalTimeMinutes: z.number().int(),
  ingredients: z.array(aiIngredientSchema),
  steps: z.array(aiStepSchema),
  tags: z.array(z.string()),
});

export type AIRecipe = z.infer<typeof aiRecipeSchema>;

// The schema sent to OpenAI can't carry min/max constraints (strict mode), so
// the model could technically return nonsense (negative times, empty items,
// zero servings). Sanitize and bound-check the result before it reaches the DB:
// clamp numeric fields, trim and drop empty entries, renumber steps. Throw only
// when nothing usable remains.
export function validateAiRecipe(recipe: AIRecipe): AIRecipe {
  const title = recipe.title.trim();

  const ingredients = recipe.ingredients
    .map((i) => ({
      qty: i.qty.trim(),
      unit: i.unit.trim(),
      item: i.item.trim(),
      notes: i.notes?.trim() || null,
      group: i.group?.trim() || null,
    }))
    .filter((i) => i.item.length > 0);

  const steps = recipe.steps
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0)
    .map((s, idx) => ({
      number: idx + 1,
      text: s.text,
      durationMinutes:
        s.durationMinutes != null && s.durationMinutes >= 0
          ? s.durationMinutes
          : null,
      timers: s.timers,
    }));

  if (!title || ingredients.length === 0 || steps.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The chef produced an incomplete recipe. Please try again.",
    });
  }

  const clampTime = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

  return {
    title,
    description: recipe.description.trim(),
    servings: recipe.servings >= 1 ? recipe.servings : 1,
    prepTimeMinutes: clampTime(recipe.prepTimeMinutes),
    cookTimeMinutes: clampTime(recipe.cookTimeMinutes),
    totalTimeMinutes: clampTime(recipe.totalTimeMinutes),
    ingredients,
    steps,
    tags: recipe.tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, MAX_TAGS),
  };
}

export function toDbIngredients(
  ingredients: AIRecipe["ingredients"]
): Ingredient[] {
  return ingredients.map((i) => ({
    qty: i.qty,
    unit: i.unit,
    item: i.item,
    ...(i.notes != null ? { notes: i.notes } : {}),
    ...(i.group != null ? { group: i.group } : {}),
  }));
}

export function toDbSteps(steps: AIRecipe["steps"]): Step[] {
  return steps.map((s) => ({
    number: s.number,
    text: s.text,
    ...(s.durationMinutes != null ? { durationMinutes: s.durationMinutes } : {}),
    ...(s.timers != null ? { timers: s.timers } : {}),
  }));
}

import { z } from "zod";

// Pure, client-safe schemas for AI plan generation/modification. Lives in lib/
// (not server/) so the streaming UI can import it for useObject without dragging
// server-only code into the client bundle. Server-side validators that bound-
// check these live in src/server/ai/tasks/plan-types.ts.
//
// OpenAI strict structured outputs require every property present and reject
// `.optional()` and min/max — so optionals are `.nullable()` and bounds are
// enforced after generation, not in the schema.

export const slotTypeSchema = z.enum([
  "recipe",
  "eating_out",
  "skip",
  "leftover",
]);

export const aiMealSchema = z.object({
  // 0 = weekStart, 1 = next day, … up to 6. The AI never sees real dates.
  dayOffset: z.number().int(),
  slotType: slotTypeSchema,
  title: z.string().nullable(),
  description: z.string().nullable(),
  rationale: z.string().nullable(),
  ingredientPreview: z.array(z.string()),
  tags: z.array(z.string()),
  estTimeMinutes: z.number().int().nullable(),
  servings: z.number().int().nullable(),
  // Rough grocery cost for this meal, in whole cents (Phase 1E.5 · W6). Asked
  // for at generation time so it survives modify + re-hydration. Nullable
  // because a model that will not guess must be able to say so — the surface
  // renders nothing rather than a zero.
  estCostCents: z.number().int().nullable(),
  // Which picked recipe this meal IS, as a 1-based reference into the picks the
  // prompt listed (Phase 1E.5 · W8). Null on a meal the chef chose itself.
  //
  // A NUMBERED REF, NEVER A DB ID — the same ID-safety pattern grocery-talk uses:
  // the model is never shown a uuid and can never emit one, so a hallucinated
  // identifier resolves to nothing instead of to somebody else's recipe. The
  // server maps ref → id against the household-scoped list it sent.
  pickedRef: z.number().int().nullable(),
  // Two short, meal-specific modification suggestions (e.g. "Make it spicier").
  chips: z.array(z.string()),
});

export const aiPlanSchema = z.object({
  // The chef's block is TWO strings at two sizes (frame 3i): the claim at 22px
  // cream, the argument at 14.5px italic gold. They were one field until S47,
  // which is why both of the model's sentences landed in the heading and pushed
  // the first meal below the fold (BUG-034).
  chefSummary: z.string(),
  // Nullable, because strict mode has no optionals and a chef with nothing to
  // add beyond the claim must be able to say so rather than pad.
  chefNote: z.string().nullable(),
  meals: z.array(aiMealSchema),
});

// A modification returns only the changes: meals to set/replace by dayOffset,
// and days to clear. The AI never returns DB slot IDs — the server maps
// dayOffset to slots within the household-scoped plan.
export const aiPlanModificationSchema = z.object({
  chefResponse: z.string(),
  changedMeals: z.array(aiMealSchema),
  removedDayOffsets: z.array(z.number().int()),
});

export type SlotType = z.infer<typeof slotTypeSchema>;
export type AIPlan = z.infer<typeof aiPlanSchema>;
export type AIMeal = z.infer<typeof aiMealSchema>;
export type AIPlanModification = z.infer<typeof aiPlanModificationSchema>;

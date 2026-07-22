import { z } from "zod";
import { groceryCategorySchema } from "@/lib/grocery-categories";

// The clean, per-line normalization the aggregator consumes — one entry per recipe
// ingredient line, aligned by index. Produced by the `ingredient-normalize` AI task
// (reconciled to this exact shape) and CACHED on the recipe row so confirm-time
// grocery generation skips the AI call. See BUG-004 / the generation-architecture
// rethink (2026-07-21). Lives in a client-safe module (no Drizzle import) so both
// the AI task and the DB schema's JSONB $type can share one definition without a
// circular import.
export const normalizedResultSchema = z.object({
  index: z.number().int(),
  canonicalName: z.string(),
  category: groceryCategorySchema,
  canonicalUnit: z.string(),
  numericQty: z.number().nullable(),
  confidence: z.number(),
});

export type NormalizedResult = z.infer<typeof normalizedResultSchema>;

// The full cache payload stored on `recipes.normalizedIngredients`: one entry per
// line in `recipes.ingredients`, same order. A length mismatch against `ingredients`
// means the cache is stale/partial and the reader must re-normalize (defensive —
// recipe ingredient lists don't mutate in place today).
export const normalizedIngredientsSchema = z.array(normalizedResultSchema);

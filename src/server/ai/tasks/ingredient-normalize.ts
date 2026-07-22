import { z } from "zod";
import { generateStructured } from "@/server/ai";
import { AI_DEFAULTS } from "@/server/ai/config";
import { GROCERY_CATEGORIES, groceryCategorySchema } from "@/server/db/schema";
import type { GroceryCategory } from "@/server/db/schema";
import {
  buildIngredientNormalizeSystemPrompt,
  buildIngredientNormalizeUserPrompt,
  type RawIngredientLine,
} from "@/server/ai/prompts/ingredient-normalize";
import type { NormalizedResult } from "@/lib/normalized-ingredient";

export type { RawIngredientLine };

// The clean, per-line normalization the aggregator consumes — one per input line,
// aligned by index (guaranteed by reconcileNormalized even if the model drifts).
// The shape lives in a client-safe module so the recipe row can cache it; re-exported
// here so existing importers are unchanged.
export type { NormalizedResult };

// OpenAI strict structured outputs: every field present, no .optional() and no
// min/max keywords. category comes back as a free string and is coerced to the
// enum below; nonsense values fall back to "other" rather than failing the call.
const aiNormalizedItemSchema = z.object({
  index: z.number().int(),
  canonicalName: z.string(),
  category: z.string(),
  canonicalUnit: z.string(),
  numericQty: z.number().nullable(),
  confidence: z.number(),
});

export const aiNormalizeSchema = z.object({
  items: z.array(aiNormalizedItemSchema),
});

export type AINormalizeResponse = z.infer<typeof aiNormalizeSchema>;

function coerceCategory(raw: string): GroceryCategory {
  const parsed = groceryCategorySchema.safeParse(raw.trim().toLowerCase());
  return parsed.success ? parsed.data : "other";
}

function clampConfidence(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function cleanNumericQty(v: number | null): number | null {
  if (v == null || !Number.isFinite(v) || v < 0) return null;
  return v;
}

// Align the model's output to the input, one entry per line, tolerating drift.
// A missing index gets a safe solo fallback (confidence 0 ⇒ the aggregator never
// merges it). The AI's outputs are only grouping keys, so a bad key is safe; the
// only thing we must guarantee is exactly one clean line per input line.
export function reconcileNormalized(
  inputLines: RawIngredientLine[],
  response: AINormalizeResponse
): NormalizedResult[] {
  const byIndex = new Map(response.items.map((it) => [it.index, it]));

  return inputLines.map((line) => {
    const ai = byIndex.get(line.index);
    if (!ai) {
      // No answer for this line — normalize it ourselves, kept solo (confidence 0).
      return {
        index: line.index,
        canonicalName: line.item.trim().toLowerCase() || "item",
        category: "other",
        canonicalUnit: line.unit.trim().toLowerCase(),
        numericQty: null,
        confidence: 0,
      };
    }

    const canonicalName =
      ai.canonicalName.trim().toLowerCase() ||
      line.item.trim().toLowerCase() ||
      "item";

    return {
      index: line.index,
      canonicalName,
      category: coerceCategory(ai.category),
      canonicalUnit: ai.canonicalUnit.trim().toLowerCase(),
      numericQty: cleanNumericQty(ai.numericQty),
      confidence: clampConfidence(ai.confidence),
    };
  });
}

// Normalize a week's worth of recipe ingredient lines in ONE batched AI call.
// Semantics only — no summing. Empty input short-circuits (no call). On failure,
// the single retry lives in generateStructured; a hard failure propagates so the
// generate pipeline can mark the list `error` and offer retry (no silent degrade).
export async function normalizeIngredients(
  lines: RawIngredientLine[]
): Promise<NormalizedResult[]> {
  if (lines.length === 0) return [];

  const response = await generateStructured({
    task: "ingredient-normalize",
    system: buildIngredientNormalizeSystemPrompt(),
    prompt: buildIngredientNormalizeUserPrompt(lines),
    schema: aiNormalizeSchema,
    // A full-week batch (~70 lines) can take ~35-40s on gpt-4.1-mini — over the
    // 30s default — and fail the whole list generation. Give it the stream-tier
    // ceiling as a stopgap. Real fix = the generation-architecture rethink
    // (incremental normalize during review); see docs/bug-tracker.md BUG-004.
    timeoutMs: AI_DEFAULTS.streamTimeoutMs,
  });

  return reconcileNormalized(lines, response);
}

export { GROCERY_CATEGORIES };

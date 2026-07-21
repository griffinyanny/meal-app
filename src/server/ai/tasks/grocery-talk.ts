import { z } from "zod";
import { generateStructured } from "@/server/ai";
import { groceryCategorySchema } from "@/server/db/schema";
import type { GroceryCategory } from "@/server/db/schema";
import {
  buildGroceryTalkSystemPrompt,
  buildGroceryTalkUserPrompt,
  type GroceryTalkRefLine,
} from "@/server/ai/prompts/grocery-talk";

export type { GroceryTalkRefLine };

// Loose AI-facing schema. OpenAI strict structured outputs want every field
// present with no .optional()/min/max, so each op carries all five keys and we
// coerce below. (Same discipline as ingredient-normalize.)
const aiOpSchema = z.object({
  kind: z.string(),
  name: z.string(),
  category: z.string(),
  qty: z.string(),
  ref: z.number(),
});

export const aiGroceryTalkSchema = z.object({
  reply: z.string(),
  ops: z.array(aiOpSchema),
});

export type AIGroceryTalkResponse = z.infer<typeof aiGroceryTalkSchema>;

// The cleaned, typed op the router applies. A discriminated union so add-fields
// and remove-fields can't be confused. A remove carries only a `ref` (a position
// in the list WE numbered) — resolved to a real id by the router, not here.
export type GroceryTalkOp =
  | { kind: "add"; name: string; category: GroceryCategory; qty: string }
  | { kind: "remove"; ref: number };

export interface GroceryTalkResult {
  reply: string;
  ops: GroceryTalkOp[];
}

function coerceCategory(raw: string): GroceryCategory {
  const parsed = groceryCategorySchema.safeParse(raw.trim().toLowerCase());
  return parsed.success ? parsed.data : "other";
}

// Coerce the model output into clean typed ops. Drops anything nonsensical
// (unknown kind, empty add name, non-positive remove ref) rather than guessing —
// a dropped op is safe; a wrong one is not. The ref is deliberately left
// unresolved: the router bounds-checks it against the real list.
export function coerceGroceryTalk(
  response: AIGroceryTalkResponse
): GroceryTalkResult {
  const ops: GroceryTalkOp[] = [];
  for (const raw of response.ops) {
    const kind = raw.kind.trim().toLowerCase();
    if (kind === "add") {
      const name = raw.name.trim();
      if (name) {
        ops.push({
          kind: "add",
          name,
          category: coerceCategory(raw.category),
          qty: raw.qty.trim(),
        });
      }
    } else if (kind === "remove") {
      const ref = Math.trunc(raw.ref);
      if (ref >= 1) ops.push({ kind: "remove", ref });
    }
  }
  return { reply: response.reply.trim(), ops };
}

// Turn a natural-language grocery request into typed ops + a one-line reply. The
// single retry lives in generateStructured; a hard failure propagates so the
// caller can surface an error (the sheet keeps the text so nothing is lost).
export async function talkToGroceryChef(
  list: GroceryTalkRefLine[],
  request: string
): Promise<GroceryTalkResult> {
  const response = await generateStructured({
    task: "grocery-talk",
    system: buildGroceryTalkSystemPrompt(),
    prompt: buildGroceryTalkUserPrompt(list, request),
    schema: aiGroceryTalkSchema,
  });
  return coerceGroceryTalk(response);
}

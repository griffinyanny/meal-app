// "Talk to the Chef" for groceries (Phase 1D, Slice D). A free-text request
// ("add stuff for tacos", "what am I out of", "remove the chicken") becomes a set
// of add/remove ops on the list plus a one-line reply. Split out of grocery.ts to
// keep files under the 300-line rule; spread back into groceryRouter so the client
// calls trpc.grocery.talk.
//
// ID SAFETY (the plan's risk note): the model never sees or emits a database id.
// It references existing items by the [N] number we assign in the prompt; here we
// resolve that number to a real id from the household's OWN list and bounds-check
// it. A hallucinated or out-of-range ref maps to nothing and is silently ignored —
// it can never delete an item the model didn't legitimately point at, and never
// reach another household (every query is household-scoped).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { aiProcedure } from "../init";
import { groceryLists, groceryItems } from "@/server/db/schema";
import { parseQtyText } from "@/server/grocery/aggregate";
import {
  talkToGroceryChef,
  type GroceryTalkRefLine,
} from "@/server/ai/tasks/grocery-talk";

// Hard ceiling on how many ops one request can apply, independent of what the
// model returns — bounds the blast radius even if the prompt cap is ignored.
const MAX_APPLIED_OPS = 12;

export const groceryTalkMutations = {
  talk: aiProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        request: z.string().trim().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.query.groceryLists.findFirst({
        where: and(
          eq(groceryLists.id, input.listId),
          eq(groceryLists.householdId, ctx.householdId)
        ),
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });

      // Load the list's items and number them 1-based. refByNumber maps the number
      // we show the model back to the real row — the model only ever sees numbers.
      const items = await ctx.db
        .select()
        .from(groceryItems)
        .where(
          and(
            eq(groceryItems.listId, input.listId),
            eq(groceryItems.householdId, ctx.householdId)
          )
        )
        .orderBy(groceryItems.position);

      const refByNumber = new Map<number, (typeof items)[number]>();
      const refLines: GroceryTalkRefLine[] = items.map((it, i) => {
        const ref = i + 1;
        refByNumber.set(ref, it);
        return { ref, name: it.name, category: it.category };
      });

      const { reply, ops } = await talkToGroceryChef(refLines, input.request);

      // Names already present (plus ones added earlier in this batch) so the chef
      // can't add a duplicate.
      const present = new Set(items.map((it) => it.name.trim().toLowerCase()));
      const removeIds = new Set<string>();
      const toInsert: (typeof groceryItems.$inferInsert)[] = [];

      for (const op of ops.slice(0, MAX_APPLIED_OPS)) {
        if (op.kind === "add") {
          const key = op.name.toLowerCase();
          if (present.has(key)) continue;
          present.add(key);
          const { quantity, unit } = op.qty
            ? parseQtyText(op.qty)
            : { quantity: null, unit: null };
          toInsert.push({
            householdId: ctx.householdId,
            listId: input.listId,
            name: op.name,
            rawName: op.name,
            quantity,
            unit,
            category: op.category,
            sourceType: "manual",
          });
        } else {
          // Resolve the model's ref to a real id WE own; ignore anything the ref
          // doesn't legitimately map to.
          const target = refByNumber.get(op.ref);
          if (target) removeIds.add(target.id);
        }
      }

      let added = 0;
      let removed = 0;
      await ctx.db.transaction(async (tx) => {
        if (removeIds.size > 0) {
          const del = await tx
            .delete(groceryItems)
            .where(
              and(
                inArray(groceryItems.id, [...removeIds]),
                eq(groceryItems.householdId, ctx.householdId)
              )
            )
            .returning({ id: groceryItems.id });
          removed = del.length;
        }
        if (toInsert.length > 0) {
          const inserted = await tx
            .insert(groceryItems)
            .values(toInsert)
            .returning({ id: groceryItems.id });
          added = inserted.length;
        }
      });

      return { reply, added, removed };
    }),
};

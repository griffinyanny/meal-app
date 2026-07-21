// Item-level grocery mutations for the shoppable list (Phase 1D, Slice C). Split
// out of grocery.ts to keep each router file under the 300-line limit; these are
// spread back into groceryRouter so the client still calls trpc.grocery.editItem.
// Every mutation is household-scoped and has a co-located test.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure, aiProcedure } from "../init";
import { groceryItems } from "@/server/db/schema";
import { numberFromQty, parseQtyText } from "@/server/grocery/aggregate";
import { normalizeIngredients } from "@/server/ai/tasks/ingredient-normalize";

export const groceryItemMutations = {
  // Inline edit of an item's display name and/or quantity. The qty arrives as the
  // free text the user typed ("2 heads") and is parsed into the stored
  // quantity+unit pair; recipe-sourced items become editable this way without a
  // separate qty/unit form.
  editItem: protectedProcedure
    .input(
      z
        .object({
          itemId: z.string().uuid(),
          // trim before min(1) so a whitespace-only name can't pass validation
          // and then blank the item's name on write.
          name: z.string().trim().min(1).max(200).optional(),
          qtyText: z.string().max(60).optional(),
        })
        .refine((v) => v.name !== undefined || v.qtyText !== undefined, {
          message: "Provide a name or quantity to update",
        })
    )
    .mutation(async ({ ctx, input }) => {
      const set = {
        updatedAt: new Date(),
        ...(input.name !== undefined
          ? { name: input.name, rawName: input.name } // already trimmed by Zod
          : {}),
        ...(input.qtyText !== undefined ? parseQtyText(input.qtyText) : {}),
      };

      const [updated] = await ctx.db
        .update(groceryItems)
        .set(set)
        .where(
          and(
            eq(groceryItems.id, input.itemId),
            eq(groceryItems.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Undo a merge: break a multi-source item back into one line per originating
  // recipe (each with that recipe's own qty/unit). A direct grocery_items edit —
  // no mergeOverrides (mid-week resync is deferred). A single-source item is a
  // no-op. See decisions.md (2026-07-20, inline merge-review + under-merge).
  splitItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.groceryItems.findFirst({
        where: and(
          eq(groceryItems.id, input.itemId),
          eq(groceryItems.householdId, ctx.householdId)
        ),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      const sources = item.sources ?? [];
      if (sources.length <= 1) return { split: 0 };

      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(groceryItems)
          .where(
            and(
              eq(groceryItems.id, item.id),
              eq(groceryItems.householdId, ctx.householdId)
            )
          );

        await tx.insert(groceryItems).values(
          sources.map((src, i) => ({
            householdId: ctx.householdId,
            listId: item.listId,
            name: item.name,
            rawName: item.rawName ?? item.name,
            quantity: numberFromQty(src.qty),
            unit: src.unit.trim() || null,
            category: item.category,
            sourceType: "recipe" as const,
            sourceRecipeId: src.recipeId,
            sources: [src],
            // Keep the split lines clustered where the merged row sat, in source
            // order — an explicit distinct position, not a reliance on sort stability.
            position: item.position + i,
          }))
        );
      });

      return { split: sources.length };
    }),

  // Remove all checked items from a list (the "Clear" action on the GOT IT zone).
  // Clearing an empty set is a no-op, not an error.
  clearChecked: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const removed = await ctx.db
        .delete(groceryItems)
        .where(
          and(
            eq(groceryItems.listId, input.listId),
            eq(groceryItems.householdId, ctx.householdId),
            eq(groceryItems.isChecked, true)
          )
        )
        .returning({ id: groceryItems.id });

      return { removed: removed.length };
    }),

  // Background "tidy" for a quick-added item: one normalize call cleans the raw
  // text into a canonical name + aisle category so the item animates into the
  // right section. Non-fatal — a normalize miss leaves the user's item as typed.
  tidyItem: aiProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.groceryItems.findFirst({
        where: and(
          eq(groceryItems.id, input.itemId),
          eq(groceryItems.householdId, ctx.householdId)
        ),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      const raw = (item.rawName ?? item.name).trim();
      const [normalized] = await normalizeIngredients([
        { index: 0, qty: "", unit: "", item: raw },
      ]);
      if (!normalized) return item;

      const [updated] = await ctx.db
        .update(groceryItems)
        .set({
          name: normalized.canonicalName,
          category: normalized.category,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groceryItems.id, item.id),
            eq(groceryItems.householdId, ctx.householdId)
          )
        )
        .returning();

      return updated ?? item;
    }),
};

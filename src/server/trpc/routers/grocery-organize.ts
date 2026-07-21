// List-organization mutations for the shoppable list (Phase 1D, Slice C):
// grouped↔manual mode, persisted section (aisle) order, and persisted item order
// for manual mode. Spread into groceryRouter (client calls trpc.grocery.*).
// Household-scoped; each has a co-located test.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../init";
import { groceryLists, groceryItems, groceryCategorySchema } from "@/server/db/schema";

export const groceryOrganizeMutations = {
  // Toggle grouped (aisle sections) ↔ manual (one flat, hand-ordered list).
  setOrganizeMode: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        mode: z.enum(["grouped", "manual"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(groceryLists)
        .set({ organizeMode: input.mode, updatedAt: new Date() })
        .where(
          and(
            eq(groceryLists.id, input.listId),
            eq(groceryLists.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Persist the section order after a drag-reorder in grouped mode. The order is
  // a permutation of the category keys; unknown keys are rejected by the enum.
  reorderSections: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        aisleOrder: z.array(groceryCategorySchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(groceryLists)
        .set({ aisleOrder: input.aisleOrder, updatedAt: new Date() })
        .where(
          and(
            eq(groceryLists.id, input.listId),
            eq(groceryLists.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Persist item order after a drag-reorder in manual mode. Writes position =
  // index for each id in the given order, scoped to the list + household so a
  // stray id from another list can't be repositioned.
  reorderItems: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx
            .update(groceryItems)
            .set({ position: i, updatedAt: new Date() })
            .where(
              and(
                eq(groceryItems.id, input.orderedIds[i]),
                eq(groceryItems.listId, input.listId),
                eq(groceryItems.householdId, ctx.householdId)
              )
            );
        }
      });

      return { reordered: input.orderedIds.length };
    }),
};

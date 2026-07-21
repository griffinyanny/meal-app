import { z } from "zod";
import { router, protectedProcedure, aiProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import {
  groceryLists,
  groceryItems,
  groceryCategorySchema,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateGroceryList } from "./grocery-generate";
import { groceryItemMutations } from "./grocery-item-mutations";
import { groceryOrganizeMutations } from "./grocery-organize";

export const groceryRouter = router({
  ...groceryItemMutations,
  ...groceryOrganizeMutations,

  current: protectedProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.query.groceryLists.findFirst({
      where: eq(groceryLists.householdId, ctx.householdId),
      orderBy: desc(groceryLists.createdAt),
    });

    if (!list) return null;

    const items = await ctx.db
      .select()
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.listId, list.id),
          eq(groceryItems.householdId, ctx.householdId)
        )
      )
      .orderBy(groceryItems.category, groceryItems.position);

    return { ...list, items };
  }),

  // Build (or retry) the projection for a pending/errored draft list. The
  // Groceries tab fires this when it lands on a `pending` list; idempotent and
  // race-safe (see generateGroceryList). AI-calling → rate-limited/budgeted.
  generate: aiProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      generateGroceryList({
        db: ctx.db,
        householdId: ctx.householdId,
        userId: ctx.user.id,
        listId: input.listId,
      })
    ),

  checkItem: protectedProcedure
    .input(
      z.object({ itemId: z.string().uuid(), isChecked: z.boolean() })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(groceryItems)
        .set({
          isChecked: input.isChecked,
          checkedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groceryItems.id, input.itemId),
            eq(groceryItems.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        name: z.string().min(1).max(200),
        category: groceryCategorySchema.default("other"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.query.groceryLists.findFirst({
        where: and(
          eq(groceryLists.id, input.listId),
          eq(groceryLists.householdId, ctx.householdId)
        ),
      });

      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [item] = await ctx.db
        .insert(groceryItems)
        .values({
          householdId: ctx.householdId,
          listId: input.listId,
          name: input.name,
          rawName: input.name,
          category: input.category,
          sourceType: "manual",
        })
        .returning();

      return item;
    }),

  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(groceryItems)
        .where(
          and(
            eq(groceryItems.id, input.itemId),
            eq(groceryItems.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
    }),
});

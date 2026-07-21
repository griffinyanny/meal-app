// Staples router (Phase 1D, Slice D). The household's saved "quick add" items
// (milk, eggs, olive oil…) surfaced as a tap-to-add chip row on the Groceries
// tab. Staples are OFFERED, never auto-added to the projection (scope open-Q #2,
// "no pantry in V1"), so this router only manages the saved set — tapping a chip
// adds a normal grocery item via grocery.addItem. Every procedure is
// household-scoped; the staple_items table already ships with RLS (migration 0002).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { stapleItems, groceryCategorySchema } from "@/server/db/schema";

export const staplesRouter = router({
  // Every saved staple, active first, then alphabetical. The chip row shows the
  // active ones; a future management view can show inactive ones too.
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(stapleItems)
      .where(eq(stapleItems.householdId, ctx.householdId))
      .orderBy(asc(stapleItems.name));
  }),

  // Save a staple. Idempotent by name (case-insensitive): re-adding an existing
  // staple reactivates it and refreshes its category rather than duplicating —
  // so "add milk" twice never leaves two milk chips.
  add: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        category: groceryCategorySchema.default("other"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.stapleItems.findFirst({
        where: and(
          eq(stapleItems.householdId, ctx.householdId),
          sql`lower(${stapleItems.name}) = ${input.name.toLowerCase()}`
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(stapleItems)
          .set({ isActive: true, category: input.category, updatedAt: new Date() })
          .where(
            and(
              eq(stapleItems.id, existing.id),
              eq(stapleItems.householdId, ctx.householdId)
            )
          )
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(stapleItems)
        .values({
          householdId: ctx.householdId,
          name: input.name,
          category: input.category,
        })
        .returning();
      return created;
    }),

  // Archive/unarchive a staple (drops it from / restores it to the chip row)
  // without losing it, so a household can pare the row down and get items back.
  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(stapleItems)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(
          and(
            eq(stapleItems.id, input.id),
            eq(stapleItems.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Permanently forget a staple.
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(stapleItems)
        .where(
          and(
            eq(stapleItems.id, input.id),
            eq(stapleItems.householdId, ctx.householdId)
          )
        )
        .returning({ id: stapleItems.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: deleted.id };
    }),
});

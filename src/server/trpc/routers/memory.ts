// Memory ledger management (Phase 1E). The You-tab ledger reads active memories
// via user.memories({ activeOnly: true }); this router owns the two writes that
// let a user CORRECT what the chef remembers:
//   - deactivate: remove (feature #3) / dismiss an implicit note (feature #6)
//   - reactivate: undo of a remove, and undo of a talk-capture deactivation
// Both flip the ai_memories.isActive flag, which getChefContext already reads —
// so the ledger and what the chef acts on stay in lockstep. Every write is
// household-scoped in the WHERE clause, so a caller can never touch another
// household's memory (defense in depth alongside RLS).
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { aiMemories } from "@/server/db/schema";

const memoryInput = z.object({ memoryId: z.string().uuid() });

export const memoryRouter = router({
  // Remove (feature #3) / dismiss an implicit note (feature #6). Idempotent —
  // deactivating an already-inactive row is a harmless no-op. Returns the id it
  // touched (or null if nothing matched) so an optimistic client can reconcile.
  deactivate: protectedProcedure
    .input(memoryInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(aiMemories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(aiMemories.id, input.memoryId),
            eq(aiMemories.householdId, ctx.householdId)
          )
        )
        .returning({ id: aiMemories.id });
      return { id: row?.id ?? null };
    }),

  // Undo path: bring a removed/dismissed memory back into the ledger and into
  // chef context. Same household-scoped guard.
  reactivate: protectedProcedure
    .input(memoryInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(aiMemories)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(aiMemories.id, input.memoryId),
            eq(aiMemories.householdId, ctx.householdId)
          )
        )
        .returning({ id: aiMemories.id });
      return { id: row?.id ?? null };
    }),
});

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getDb } from "@/server/db";
import { householdMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export async function createTRPCContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { db: getDb(), user, supabase };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const membership = await ctx.db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, ctx.user.id),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No household membership found",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      householdId: membership.householdId,
    },
  });
});

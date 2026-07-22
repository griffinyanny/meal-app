import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getDb } from "@/server/db";
import { householdMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import {
  checkAiRateLimit,
  checkAiBackgroundRateLimit,
  consumeDailyAiBudget,
} from "@/server/ratelimit";

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

// protectedProcedure + per-user rate limiting. Use for any procedure that calls
// the AI provider, so a runaway client can't burn the provider key.
export const aiProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const result = checkAiRateLimit(ctx.user.id);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "You're asking the chef a lot right now — give it a few seconds and try again.",
    });
  }

  // Distributed hard cap: the in-memory check above resets per serverless
  // instance; this one is enforced in Postgres across all of them.
  const daily = await consumeDailyAiBudget(ctx.db, ctx.user.id, ctx.householdId);
  if (!daily.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "The chef has hit today's limit — come back tomorrow.",
    });
  }

  return next();
});

// protectedProcedure + a SEPARATE background rate-limit bucket, for best-effort
// AI fan-out that the app fires on the user's behalf (not a call they're watching)
// — today just the review-time grocery normalize (BUG-004). It deliberately does
// NOT share the interactive bucket (so it can never 429 a user-visible hydrate) and
// does NOT consume the daily budget (the recipe-generate that produced this recipe
// already counted; this derivative normalize shouldn't double-charge the user's
// 150/day). Its own bounded bucket still protects the provider key from a loop.
export const bgAiProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const result = checkAiBackgroundRateLimit(ctx.user.id);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Background work is catching up — try again shortly.",
    });
  }
  return next();
});

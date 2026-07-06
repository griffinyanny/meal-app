import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { householdMembers, mealPlans, mealPlanSlots } from "@/server/db/schema";
import { getChefContext } from "@/server/ai/memory";
import { generateStream } from "@/server/ai";
import { buildPlanStreamParams } from "@/server/ai/tasks/generate-plan";
import {
  validatePlan,
  toSlotValues,
  type AIPlan,
  type ValidatedPlan,
} from "@/server/ai/tasks/plan-types";
import { checkAiRateLimit, consumeDailyAiBudget } from "@/server/ratelimit";

export const maxDuration = 60;

const bodySchema = z.object({
  request: z.string().max(1000).optional(),
});

type Db = ReturnType<typeof getDb>;

// The plan starts today (UTC), not the calendar-week Sunday — so generating
// mid-week plans dinners from today forward instead of backfilling days that
// already passed (which would wrongly render as "past" meals). dayOffset 0 is
// today. Regenerating the same day replaces that day's plan.
function planStartDate(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

// One active plan per household in V1: generating replaces THE current plan
// (regardless of week or status — it's an explicit "make me a new plan").
// Keying replacement on week_start instead left stale plans that `current`
// could resurface. Transactional so a partial plan never lands in the DB.
async function persistPlan(
  db: Db,
  householdId: string,
  weekStart: string,
  plan: ValidatedPlan
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(mealPlans)
      .where(eq(mealPlans.householdId, householdId));

    const [created] = await tx
      .insert(mealPlans)
      .values({
        householdId,
        weekStart,
        status: "draft",
        chefSummary: plan.chefSummary,
      })
      .returning();

    if (plan.meals.length > 0) {
      await tx.insert(mealPlanSlots).values(
        plan.meals.map((meal) => ({
          householdId,
          planId: created.id,
          mealType: "dinner" as const,
          ...toSlotValues(meal),
        }))
      );
    }
  });
}

export async function POST(req: Request): Promise<Response> {
  // CSRF guard: this is a cookie-authenticated, state-changing route (replaces
  // the household's current plan), so cross-origin requests are rejected
  // outright rather than relying on SameSite cookie defaults alone.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return new Response("Cross-origin request rejected", { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, user.id),
  });

  if (!membership) {
    return new Response("No household membership", { status: 403 });
  }
  const householdId = membership.householdId;

  const rate = checkAiRateLimit(user.id);
  if (!rate.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  // Distributed hard cap (Postgres-backed, holds across serverless instances).
  const daily = await consumeDailyAiBudget(db, user.id, householdId);
  if (!daily.allowed) {
    return new Response("Daily AI budget exhausted", { status: 429 });
  }

  let rawBody: unknown = {};
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const weekStart = planStartDate(new Date());
  const chef = await getChefContext(db, householdId, user.id);
  const params = buildPlanStreamParams({ request: parsed.data.request, ...chef });

  const result = generateStream<AIPlan>({
    ...params,
    // Runs after the stream completes; persists the finished plan. Swallows its
    // own errors so a DB failure never breaks the client stream — the client
    // settles onto the persisted plan via a tRPC plan.current refetch.
    onComplete: async (object) => {
      try {
        const validated = validatePlan(object, {
          weekStart,
          defaultServings: chef.householdSize,
        });
        await persistPlan(db, householdId, weekStart, validated);
      } catch (err) {
        console.error("[plan/stream] failed to persist plan:", err);
      }
    },
  });

  return result.toTextStreamResponse();
}

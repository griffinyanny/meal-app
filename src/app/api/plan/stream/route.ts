import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import {
  householdMembers,
  mealPlans,
  mealPlanSlots,
  recipes,
} from "@/server/db/schema";
import { getChefContext } from "@/server/ai/memory";
import { generateStream } from "@/server/ai";
import { buildPlanStreamParams } from "@/server/ai/tasks/generate-plan";
import {
  validatePlan,
  toSlotValues,
  type AIPlan,
  type ValidatedPlan,
} from "@/server/ai/tasks/plan-types";
import {
  resolvePickedRecipeId,
  type PickInput,
} from "@/server/ai/tasks/plan-picks";
import { MAX_PICKS_PER_WEEK } from "@/lib/plan/pick-limits";
import { checkAiRateLimit, consumeDailyAiBudget } from "@/server/ratelimit";
import { isEmailAllowed } from "@/lib/access";

// BUG-035. Was 60 — EQUAL to the AI abort it was supposed to outlive, so on
// Vercel the platform's kill and our own timeout landed at the same instant and
// this route never got to report its own failure. Hobby allows up to 300s with
// fluid compute (on by default), so the old 60 was self-imposed, not a ceiling.
//
// 120 sits above the 100s outer AI budget, which sits above two 45s attempts.
// Each layer must be strictly slower than the one it contains, or the outer one
// silently pre-empts the inner one's error handling.
export const maxDuration = 120;

const bodySchema = z.object({
  request: z.string().max(1000).optional(),
  // W8 · library recipes chosen on the intent screen, as ids. Every one is
  // re-read household-scoped below — an id from the client is a request, not a
  // fact.
  pickedRecipeIds: z.array(z.string().uuid()).max(MAX_PICKS_PER_WEEK).optional(),
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
  plan: ValidatedPlan,
  picks: PickInput[]
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
        chefNote: plan.chefNote,
      })
      .returning();

    if (plan.meals.length > 0) {
      await tx.insert(mealPlanSlots).values(
        plan.meals.map((meal) => {
          const pickedRecipeId = resolvePickedRecipeId(meal.pickedRef, picks);
          return {
            householdId,
            planId: created.id,
            mealType: "dinner" as const,
            ...toSlotValues(meal),
            pickedRecipeId,
            // A picked slot is ALREADY hydrated — it points at a recipe the
            // person wrote or kept, with real ingredients and steps. Linking it
            // here does two jobs: the meal sheet's `View full recipe` works on
            // the night it lands, and (build dependency 4) `normalizeSlot` has a
            // recipeId to warm the grocery cache from at pick time instead of at
            // confirm, which is the exact latency BUG-004 exists to prevent.
            //
            // Marking it "ready" is also what stops the hydration walker from
            // generating a fresh recipe over the top of the person's own — the
            // silent substitution §B's "I won't rewrite it" promises against.
            ...(pickedRecipeId
              ? { recipeId: pickedRecipeId, recipeStatus: "ready" as const }
              : {}),
          };
        })
      );
    }
  });
}

/**
 * The picks this generation is bound by: what the person just chose, plus what
 * the week they are replacing already carried.
 *
 * PICKS SURVIVE A REGENERATE BY DEFAULT (ledger §B). Regenerate routes back
 * through the intent screen, which posts here, which deletes the current plan —
 * so without this a re-roll would silently discard every recipe the person had
 * deliberately chosen, and the guarantee the UI states before the ask would be
 * a lie. Reading them back off the old plan is what makes it true.
 */
async function collectPicks(
  db: Db,
  householdId: string,
  requestedIds: string[]
): Promise<PickInput[]> {
  const carried = await db
    .select({ id: mealPlanSlots.pickedRecipeId })
    .from(mealPlanSlots)
    .where(eq(mealPlanSlots.householdId, householdId));

  const ids = [
    ...new Set([
      ...requestedIds,
      ...carried.map((c) => c.id).filter((id): id is string => id != null),
    ]),
  ].slice(0, MAX_PICKS_PER_WEEK);

  if (ids.length === 0) return [];

  // Re-read household-scoped. An id that is not this household's simply does not
  // come back, so a forged body cannot pull another household's recipe into a
  // prompt or onto a plan.
  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      servings: recipes.servings,
      totalTimeMinutes: recipes.totalTimeMinutes,
    })
    .from(recipes)
    .where(and(eq(recipes.householdId, householdId), inArray(recipes.id, ids)));

  return rows;
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

  // Gate 2. This route does NOT go through tRPC, so it doesn't inherit the
  // allowlist check in protectedProcedure — and it is the single most expensive
  // endpoint in the app. No-op when ALLOWED_EMAILS is unset.
  if (!isEmailAllowed(user.email)) {
    return new Response("Not on the invite list", { status: 403 });
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
  // Collected BEFORE persistPlan deletes the current plan — that delete is what
  // would otherwise take the carried picks with it.
  const picks = await collectPicks(db, householdId, parsed.data.pickedRecipeIds ?? []);
  const params = buildPlanStreamParams({
    weekStart,
    request: parsed.data.request,
    picks,
    ...chef,
  });

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
        await persistPlan(db, householdId, weekStart, validated, picks);
      } catch (err) {
        console.error("[plan/stream] failed to persist plan:", err);
      }
    },
  });

  return result.toTextStreamResponse();
}

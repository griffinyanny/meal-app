// Node-side seeding/reset for the Plan-tab E2E specs. Writes directly to the DB
// (service-role Drizzle, bypasses RLS) scoped HARD to the test household.
//
// Safety: every write is preceded by assertTestHousehold(), which refuses to
// proceed unless the resolved household is the sentinel-named "E2E Test Kitchen"
// whose ONLY member is the test user. Deletes are always household/user scoped
// and never touch users/households/membership rows. This runs against Griffin's
// real Supabase project; the guarded test household is the isolation boundary.
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../src/server/db/schema";
import type { SlotType } from "../../../src/lib/plan-schema";
import { timeframeOf, type Timeframe } from "../../../src/components/plan/plan-helpers";
import { makeSeedDb } from "../harness/seed-client";
import { readTestContext, type TestContext } from "./test-context";
import { env, TEST_HOUSEHOLD_NAME } from "./env";
import { buildSeedSpec, type PlanState, type SeedOptions } from "./seed-states";
import { buildGrocerySpec, type GroceryState } from "./grocery-seed-states";
import { buildRecipeSpec, type RecipeState } from "./recipe-seed-states";

type Db = PostgresJsDatabase<typeof schema>;

async function assertTestHousehold(db: Db, ctx: TestContext): Promise<void> {
  const household = await db.query.households.findFirst({
    where: eq(schema.households.id, ctx.householdId),
  });
  if (!household) {
    throw new Error(`seed guard: household ${ctx.householdId} not found — refusing to write.`);
  }
  if (household.name !== TEST_HOUSEHOLD_NAME) {
    throw new Error(
      `seed guard: household name is "${household.name}", not the sentinel "${TEST_HOUSEHOLD_NAME}" — refusing to write.`
    );
  }
  const members = await db
    .select()
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.householdId, ctx.householdId));
  if (members.length !== 1 || members[0].userId !== ctx.userId) {
    throw new Error(
      "seed guard: test household must have exactly one member (the test user) — refusing to write."
    );
  }
}

// Household/user-scoped wipe. Never deletes users/households/membership.
async function wipe(db: Db, ctx: TestContext): Promise<void> {
  // Grocery items before lists (FK), though a list delete would cascade anyway.
  await db
    .delete(schema.groceryItems)
    .where(eq(schema.groceryItems.householdId, ctx.householdId));
  await db
    .delete(schema.groceryLists)
    .where(eq(schema.groceryLists.householdId, ctx.householdId));
  await db
    .delete(schema.stapleItems)
    .where(eq(schema.stapleItems.householdId, ctx.householdId));
  await db
    .delete(schema.mealPlanSlots)
    .where(eq(schema.mealPlanSlots.householdId, ctx.householdId));
  // Recipes before plans: a plan-draft recipe's sourcePlanId cascades from plans,
  // and slots (deleted above) reference recipes via recipeId. Clearing recipes
  // explicitly keeps the Recipes-tab specs deterministic.
  await db
    .delete(schema.recipes)
    .where(eq(schema.recipes.householdId, ctx.householdId));
  await db
    .delete(schema.mealPlans)
    .where(eq(schema.mealPlans.householdId, ctx.householdId));
  await db
    .delete(schema.aiMemories)
    .where(eq(schema.aiMemories.householdId, ctx.householdId));
  await db
    .delete(schema.aiUsageDaily)
    .where(eq(schema.aiUsageDaily.userId, ctx.userId));
}

export interface SeededSlot {
  date: string;
  dayOffset: number;
  title: string | null;
  slotType: SlotType;
  timeframe: Timeframe;
}

export interface SeededPlan {
  planId: string | null;
  weekStart: string | null;
  slots: SeededSlot[];
}

export async function resetTestHousehold(): Promise<void> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);
  } finally {
    await close();
  }
}

// Resets the test household to EMPTY, then materializes the named state. Returns
// the created plan id, weekStart, and per-day slots (with computed timeframe) so
// specs can target cards by date without recomputing UTC math.
export async function seedPlanState(
  state: PlanState,
  opts?: SeedOptions
): Promise<SeededPlan> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);

    const spec = buildSeedSpec(state, opts);
    if (!spec) return { planId: null, weekStart: null, slots: [] };

    const [plan] = await db
      .insert(schema.mealPlans)
      .values({
        householdId: ctx.householdId,
        weekStart: spec.weekStart,
        status: spec.status,
        chefSummary: spec.chefSummary,
        confirmedAt: spec.status === "confirmed" ? new Date() : null,
      })
      .returning();

    await db.insert(schema.mealPlanSlots).values(
      spec.slots.map((s) => ({
        householdId: ctx.householdId,
        planId: plan.id,
        mealType: "dinner" as const,
        date: s.date,
        slotType: s.slotType,
        title: s.title,
        description: s.description,
        ingredientPreview: s.ingredientPreview,
        slotTags: s.slotTags,
        estTimeMinutes: s.estTimeMinutes,
        chips: s.chips,
        servings: s.servings,
        rationale: s.rationale,
      }))
    );

    return {
      planId: plan.id,
      weekStart: spec.weekStart,
      slots: spec.slots.map((s, i) => ({
        date: s.date,
        dayOffset: i,
        title: s.title,
        slotType: s.slotType,
        timeframe: timeframeOf(s.date),
      })),
    };
  } finally {
    await close();
  }
}

// Resets the test household, then materializes a named Groceries state: one
// grocery_lists row (in the given generationStatus/organizeMode) plus its items.
// Returns the created list id so specs can assert against it if needed.
export async function seedGroceryState(state: GroceryState): Promise<{ listId: string }> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);

    const spec = buildGrocerySpec(state);
    const [list] = await db
      .insert(schema.groceryLists)
      .values({
        householdId: ctx.householdId,
        status: "draft",
        generationStatus: spec.generationStatus,
        generationError: spec.generationError,
        organizeMode: spec.organizeMode,
        aisleOrder: [],
      })
      .returning();

    if (spec.items.length > 0) {
      await db.insert(schema.groceryItems).values(
        spec.items.map((item) => ({
          householdId: ctx.householdId,
          listId: list.id,
          name: item.name,
          rawName: item.rawName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category as (typeof schema.GROCERY_CATEGORIES)[number],
          sourceType: item.sourceType,
          sourceRecipeId: null,
          sources: item.sources,
          isChecked: item.isChecked,
          position: item.position,
        }))
      );
    }

    if (spec.staples.length > 0) {
      await db.insert(schema.stapleItems).values(
        spec.staples.map((s) => ({
          householdId: ctx.householdId,
          name: s.name,
          category: s.category as (typeof schema.GROCERY_CATEGORIES)[number],
          isActive: s.isActive,
        }))
      );
    }

    return { listId: list.id };
  } finally {
    await close();
  }
}

// Resets the test household, then materializes a named Recipes-tab state: an
// optional plan (for drafts / the cooked-harvest source), the recipes, and any
// past confirmed slots. Insert order respects FKs: plan → recipes → slots.
export async function seedRecipeState(state: RecipeState): Promise<void> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);

    const spec = buildRecipeSpec(state);

    if (spec.plan) {
      await db.insert(schema.mealPlans).values({
        id: spec.plan.id,
        householdId: ctx.householdId,
        weekStart: spec.plan.weekStart,
        status: spec.plan.status,
        confirmedAt: spec.plan.status === "confirmed" ? new Date() : null,
      });
    }

    if (spec.recipes.length > 0) {
      await db.insert(schema.recipes).values(
        spec.recipes.map((r) => ({
          id: r.id,
          householdId: ctx.householdId,
          title: r.title,
          description: r.description,
          sourceType: r.sourceType,
          sourcePlanId: r.sourcePlanId,
          isFavorite: r.isFavorite,
          lastCookedAt: r.lastCookedAt ? new Date(r.lastCookedAt) : null,
          totalTimeMinutes: r.totalTimeMinutes,
          servings: r.servings,
          tags: r.tags,
          ingredients: [],
          steps: [],
        }))
      );
    }

    if (spec.plan && spec.slots.length > 0) {
      await db.insert(schema.mealPlanSlots).values(
        spec.slots.map((s) => ({
          householdId: ctx.householdId,
          planId: spec.plan!.id,
          mealType: "dinner" as const,
          slotType: "recipe" as const,
          date: s.date,
          recipeId: s.recipeId,
          recipeStatus: "ready" as const,
        }))
      );
    }
  } finally {
    await close();
  }
}

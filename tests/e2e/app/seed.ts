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
import { buildYouSpec, type YouState } from "./you-seed-states";

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
    .delete(schema.userPreferences)
    .where(eq(schema.userPreferences.householdId, ctx.householdId));
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
        chefNote: spec.chefNote ?? null,
        confirmedAt: spec.status === "confirmed" ? new Date() : null,
      })
      .returning();

    // W8 · the library the picker reads. Inserted before the slots so a spec that
    // performs a pick has something to pick, and with fixed ids so an assertion
    // can name one.
    if (spec.library && spec.library.length > 0) {
      await db.insert(schema.recipes).values(
        spec.library.map((r) => ({
          id: r.id,
          householdId: ctx.householdId,
          title: r.title,
          sourceType: r.sourceType,
          // Never a plan draft: `sourcePlanId IS NULL` is half of build
          // dependency 1's staleness query, and a library seeded as drafts would
          // make the picker's opening content silently empty.
          sourcePlanId: null,
          lastCookedAt: r.lastCookedAt ? new Date(r.lastCookedAt) : null,
          totalTimeMinutes: r.totalTimeMinutes,
          servings: r.servings,
          // Real ingredients, because build dependency 4 warms the normalize
          // cache from them at pick time — an empty list would make the warm a
          // silent no-op and the coverage a lie.
          ingredients: [
            { qty: "1", unit: "lb", item: "the main thing" },
            { qty: "2", unit: "tbsp", item: "olive oil" },
          ],
          steps: [{ number: 1, text: "Cook it." }],
        }))
      );
    }

    // W9 · a picked slot points at a REAL library recipe, so the FK resolves and
    // the row is genuinely what the picker will later produce. `sourcePlanId`
    // stays null deliberately: a picked recipe came out of the deliberate
    // library, not out of a plan draft, and that is exactly the distinction the
    // staleness query (build dependency 1) reads.
    const pickedTitles = spec.slots.filter((s) => s.picked).map((s) => s.title);
    const pickedIdByTitle = new Map<string, string>();
    if (pickedTitles.length > 0) {
      const rows = await db
        .insert(schema.recipes)
        .values(
          pickedTitles.map((title) => ({
            householdId: ctx.householdId,
            title: title ?? "Picked recipe",
            // Not "plan_generated": this recipe existed BEFORE the plan and is
            // the reason the slot looks the way it does. Getting this wrong
            // would also put it in the Recipes tab's drafts shelf instead of
            // the library it was chosen from.
            sourceType: "ai_generated" as const,
            servings: 4,
            totalTimeMinutes: 40,
            // Required, and real rather than empty on purpose: build dependency
            // 4 says a picked recipe may have no `normalized_ingredients` cache,
            // so the state that exercises pick-time cache warming next session
            // needs actual ingredients to normalize.
            ingredients: [
              { qty: "150", unit: "g", item: "guanciale" },
              { qty: "60", unit: "g", item: "pecorino" },
              { qty: "3", unit: "", item: "eggs" },
              { qty: "200", unit: "g", item: "spaghetti" },
            ],
            steps: [
              { number: 1, text: "Render the guanciale." },
              { number: 2, text: "Toss off the heat." },
            ],
          }))
        )
        .returning();
      rows.forEach((r) => pickedIdByTitle.set(r.title, r.id));
    }

    await db.insert(schema.mealPlanSlots).values(
      spec.slots.map((s) => ({
        householdId: ctx.householdId,
        planId: plan.id,
        mealType: s.mealType ?? ("dinner" as const),
        date: s.date,
        slotType: s.slotType,
        title: s.title,
        description: s.description,
        ingredientPreview: s.ingredientPreview,
        slotTags: s.slotTags,
        estTimeMinutes: s.estTimeMinutes,
        estCostCents: s.estCostCents ?? null,
        chips: s.chips,
        servings: s.servings,
        rationale: s.rationale,
        pickedRecipeId: s.picked
          ? (pickedIdByTitle.get(s.title ?? "") ?? null)
          : null,
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

    // When the state carries a plan (GR-L1/GR-L2), materialize a confirmed plan +
    // its recipes + slots first, and link the list to it via mealPlanId — so
    // confirm-time generation reads real cached recipes and the straggler count
    // has real unready slots to count. Insert order respects FKs: plan → recipes
    // → slots. Recipe rows carry their review-time normalize cache (BUG-004).
    let mealPlanId: string | null = null;
    if (spec.plan) {
      const [plan] = await db
        .insert(schema.mealPlans)
        .values({
          householdId: ctx.householdId,
          weekStart: "2026-01-05",
          status: "confirmed",
          confirmedAt: new Date(),
        })
        .returning();
      mealPlanId = plan.id;

      if (spec.plan.recipes.length > 0) {
        await db.insert(schema.recipes).values(
          spec.plan.recipes.map((r) => ({
            id: r.id,
            householdId: ctx.householdId,
            title: r.title,
            sourceType: "plan_generated" as const,
            sourcePlanId: plan.id,
            ingredients: r.ingredients,
            steps: [],
            normalizedIngredients:
              r.normalizedIngredients as (typeof schema.recipes.$inferInsert)["normalizedIngredients"],
            normalizedAt: r.normalizedIngredients ? new Date() : null,
          }))
        );
      }

      await db.insert(schema.mealPlanSlots).values(
        spec.plan.slots.map((s, i) => ({
          householdId: ctx.householdId,
          planId: plan.id,
          mealType: "dinner" as const,
          date: `2026-01-0${5 + i}`,
          slotType: s.slotType,
          title: s.title,
          recipeId: s.recipeId,
          recipeStatus: s.recipeStatus,
        }))
      );
    }

    const [list] = await db
      .insert(schema.groceryLists)
      .values({
        householdId: ctx.householdId,
        mealPlanId,
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

// Resets the test household, then materializes a named You-tab state: the
// user_preferences row (hard constraints) + the ai_memories ledger. Memories get
// descending createdAt (spec order = display order) so the "newest first" ledger
// and collapse-to-3 are deterministic.
export async function seedYouState(state: YouState): Promise<void> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);

    const spec = buildYouSpec(state);

    if (spec.preferences) {
      await db.insert(schema.userPreferences).values({
        userId: ctx.userId,
        householdId: ctx.householdId,
        dietaryFramework: spec.preferences.dietaryFramework,
        restrictions: spec.preferences.restrictions,
        dislikes: spec.preferences.dislikes,
        householdSize: spec.preferences.householdSize,
        householdComposition: spec.preferences.householdComposition,
        maxCookTimeWeeknight: spec.preferences.maxCookTimeWeeknight,
        maxCookTimeWeekend: spec.preferences.maxCookTimeWeekend,
        cuisinePreferences: spec.preferences.cuisinePreferences,
      });
    }

    if (spec.memories.length > 0) {
      const base = Date.UTC(2026, 0, 10, 12, 0, 0);
      await db.insert(schema.aiMemories).values(
        spec.memories.map((m, i) => ({
          householdId: ctx.householdId,
          userId: ctx.userId,
          content: m.content,
          category: m.category,
          sourceType: m.sourceType,
          isActive: true,
          createdAt: new Date(base - i * 60_000),
        }))
      );
    }
  } finally {
    await close();
  }
}

// The onboarding-interview gate (Phase 1E #4). The interview fires when the
// test user's onboardingCompletedAt is NULL, so a spec picks its starting
// condition here: ONBOARDING_NEW is a first-ever login, ONBOARDING_DONE is a
// user who has already completed or skipped it. Also clears household data so
// the interview's writes are the only ones present. The users-row write is
// scoped to the test user id and runs only after the sentinel-household guard.
export type OnboardingState = "ONBOARDING_NEW" | "ONBOARDING_DONE";

export async function seedOnboardingState(state: OnboardingState): Promise<void> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    await assertTestHousehold(db, ctx);
    await wipe(db, ctx);

    await db
      .update(schema.users)
      .set({
        onboardingCompletedAt: state === "ONBOARDING_DONE" ? new Date() : null,
      })
      .where(eq(schema.users.id, ctx.userId));
  } finally {
    await close();
  }
}

// Reads back what the interview persisted, so a spec can assert the chef
// actually learned what the user tapped (rather than only that the UI moved).
export async function readOnboardingResult(): Promise<{
  onboardingCompletedAt: Date | null;
  householdSize: number | null;
  householdComposition: unknown;
  dietaryFramework: string | null;
  restrictions: string[];
  maxCookTimeWeeknight: number | null;
  onboardingMemories: string[];
}> {
  const ctx = readTestContext();
  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    const [user, prefs, memories] = await Promise.all([
      db.query.users.findFirst({ where: eq(schema.users.id, ctx.userId) }),
      db.query.userPreferences.findFirst({
        where: eq(schema.userPreferences.userId, ctx.userId),
      }),
      db
        .select({
          content: schema.aiMemories.content,
          sourceType: schema.aiMemories.sourceType,
        })
        .from(schema.aiMemories)
        .where(eq(schema.aiMemories.householdId, ctx.householdId)),
    ]);

    return {
      onboardingCompletedAt: user?.onboardingCompletedAt ?? null,
      householdSize: prefs?.householdSize ?? null,
      householdComposition: prefs?.householdComposition ?? null,
      dietaryFramework: prefs?.dietaryFramework ?? null,
      restrictions: (prefs?.restrictions as string[] | null) ?? [],
      maxCookTimeWeeknight: prefs?.maxCookTimeWeeknight ?? null,
      onboardingMemories: memories
        .filter((m) => m.sourceType === "onboarding")
        .map((m) => m.content),
    };
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
          // ⚠️ These were hard-coded `[]` until S53, which made every seeded
          // recipe render BUG-038's empty labelled cards and left the Recipes
          // detail capture grading a body-less screen as though it were normal.
          // The bodies now come from the spec, which keeps exactly one recipe
          // deliberately empty. See `recipe-seed-states.ts`.
          ingredients: r.ingredients,
          steps: r.steps,
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

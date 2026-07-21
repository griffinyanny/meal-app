import { z } from "zod";
import { router, protectedProcedure, aiProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { recipes } from "@/server/db/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { generateRecipe } from "@/server/ai/tasks/generate-recipe";
import { parseRecipeUrl, RecipeFetchError } from "@/server/ai/tasks/parse-recipe-url";
import { modifyRecipe } from "@/server/ai/tasks/modify-recipe";
import { getChefContext } from "@/server/ai/memory";
import { toDbIngredients, toDbSteps } from "@/server/ai/tasks/types";

export const recipeRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(recipes)
        .where(eq(recipes.householdId, ctx.householdId))
        .orderBy(desc(recipes.createdAt))
        .limit(input?.limit ?? 20);

      return { items };
    }),

  // Convention (open-questions #3, settled in 1D): point-read QUERIES return
  // `null` on not-found / cross-household; MUTATIONS (favorite, modify, delete)
  // throw NOT_FOUND. Returning null keeps optional reads (e.g. the plan meal
  // sheet fetching a slot's recipe) on a graceful fallback instead of a query
  // error state; a mutation on a missing row is a real error, so it throws.
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.query.recipes.findFirst({
        where: and(
          eq(recipes.id, input.id),
          eq(recipes.householdId, ctx.householdId)
        ),
      });

      return recipe ?? null;
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      // Escape ILIKE wildcards so user input matches literally.
      const term = `%${input.query.replace(/[%_\\]/g, "\\$&")}%`;

      const results = await ctx.db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.householdId, ctx.householdId),
            or(
              ilike(recipes.title, term),
              ilike(recipes.description, term)
            )
          )
        )
        .orderBy(desc(recipes.createdAt))
        .limit(20);

      return results;
    }),

  generate: aiProcedure
    .input(z.object({ prompt: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const chefCtx = await getChefContext(
        ctx.db,
        ctx.householdId,
        ctx.user.id
      );

      const aiRecipe = await generateRecipe({
        prompt: input.prompt,
        ...chefCtx,
      });

      const [saved] = await ctx.db
        .insert(recipes)
        .values({
          householdId: ctx.householdId,
          title: aiRecipe.title,
          description: aiRecipe.description,
          servings: aiRecipe.servings,
          prepTimeMinutes: aiRecipe.prepTimeMinutes,
          cookTimeMinutes: aiRecipe.cookTimeMinutes,
          totalTimeMinutes: aiRecipe.totalTimeMinutes,
          sourceType: "ai_generated",
          ingredients: toDbIngredients(aiRecipe.ingredients),
          steps: toDbSteps(aiRecipe.steps),
          tags: aiRecipe.tags,
          generationPrompt: input.prompt,
        })
        .returning();

      return saved;
    }),

  importUrl: aiProcedure
    .input(z.object({ url: z.string().url().max(2048) }))
    .mutation(async ({ ctx, input }) => {
      let aiRecipe;
      try {
        aiRecipe = await parseRecipeUrl(input.url);
      } catch (error) {
        if (error instanceof RecipeFetchError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }

      const [saved] = await ctx.db
        .insert(recipes)
        .values({
          householdId: ctx.householdId,
          title: aiRecipe.title,
          description: aiRecipe.description,
          servings: aiRecipe.servings,
          prepTimeMinutes: aiRecipe.prepTimeMinutes,
          cookTimeMinutes: aiRecipe.cookTimeMinutes,
          totalTimeMinutes: aiRecipe.totalTimeMinutes,
          sourceType: "url_import",
          sourceUrl: input.url,
          ingredients: toDbIngredients(aiRecipe.ingredients),
          steps: toDbSteps(aiRecipe.steps),
          tags: aiRecipe.tags,
        })
        .returning();

      return saved;
    }),

  modify: aiProcedure
    .input(
      z.object({
        recipeId: z.string().uuid(),
        modification: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.query.recipes.findFirst({
        where: and(
          eq(recipes.id, input.recipeId),
          eq(recipes.householdId, ctx.householdId)
        ),
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const chefCtx = await getChefContext(
        ctx.db,
        ctx.householdId,
        ctx.user.id
      );

      const aiRecipe = await modifyRecipe({
        originalTitle: original.title,
        originalIngredients: original.ingredients,
        originalSteps: original.steps,
        originalServings: original.servings,
        modificationRequest: input.modification,
        dietaryFramework: chefCtx.dietaryFramework,
        restrictions: chefCtx.restrictions,
        dislikedFoods: chefCtx.dislikedFoods,
        memories: chefCtx.memories,
      });

      const [saved] = await ctx.db
        .insert(recipes)
        .values({
          householdId: ctx.householdId,
          title: aiRecipe.title,
          description: aiRecipe.description,
          servings: aiRecipe.servings,
          prepTimeMinutes: aiRecipe.prepTimeMinutes,
          cookTimeMinutes: aiRecipe.cookTimeMinutes,
          totalTimeMinutes: aiRecipe.totalTimeMinutes,
          sourceType: "modification",
          parentRecipeId: original.id,
          ingredients: toDbIngredients(aiRecipe.ingredients),
          steps: toDbSteps(aiRecipe.steps),
          tags: aiRecipe.tags,
          generationPrompt: input.modification,
        })
        .returning();

      return saved;
    }),

  favorite: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isFavorite: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(recipes)
        .set({ isFavorite: input.isFavorite, updatedAt: new Date() })
        .where(
          and(
            eq(recipes.id, input.id),
            eq(recipes.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(recipes)
        .where(
          and(
            eq(recipes.id, input.id),
            eq(recipes.householdId, ctx.householdId)
          )
        )
        .returning({ id: recipes.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { success: true };
    }),
});

import { eq, and, desc } from "drizzle-orm";
import { userPreferences, aiMemories } from "@/server/db/schema/memory";
import type { getDb } from "@/server/db";

type Db = ReturnType<typeof getDb>;

export interface ChefMemoryContext {
  dietaryFramework?: string;
  restrictions: string[];
  dislikedFoods: string[];
  householdSize: number;
  maxCookTimeMinutes: number;
  memories: string[];
}

export async function getChefContext(
  db: Db,
  householdId: string,
  userId: string
): Promise<ChefMemoryContext> {
  const [prefs, memories] = await Promise.all([
    db.query.userPreferences.findFirst({
      where: and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.householdId, householdId)
      ),
    }),
    db
      .select({ content: aiMemories.content })
      .from(aiMemories)
      .where(
        and(
          eq(aiMemories.householdId, householdId),
          eq(aiMemories.isActive, true)
        )
      )
      .orderBy(desc(aiMemories.updatedAt))
      .limit(50),
  ]);

  return {
    dietaryFramework: prefs?.dietaryFramework ?? undefined,
    restrictions: (prefs?.restrictions as string[] | null) ?? [],
    dislikedFoods: (prefs?.dislikes as string[] | null) ?? [],
    householdSize: prefs?.householdSize ?? 2,
    maxCookTimeMinutes: prefs?.maxCookTimeWeeknight ?? 45,
    memories: memories.map((m) => m.content),
  };
}

interface WriteMemoryInput {
  db: Db;
  householdId: string;
  userId: string;
  content: string;
  category: "preference" | "brand" | "feedback" | "behavior" | "restriction";
  sourceType: "explicit" | "implicit" | "onboarding";
  confidence?: number;
}

export async function writeMemory(input: WriteMemoryInput) {
  const [memory] = await input.db
    .insert(aiMemories)
    .values({
      householdId: input.householdId,
      userId: input.userId,
      content: input.content,
      category: input.category,
      sourceType: input.sourceType,
      confidence: input.confidence ?? 0.8,
    })
    .returning();

  return memory;
}

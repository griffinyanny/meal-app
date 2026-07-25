// "Talk to the chef" for the You tab (Phase 1E) — the AI-first capture path, and
// the design's hero. A free-text message ("I'm not pescatarian anymore, and I'm
// allergic to gluten") becomes typed constraint edits + memory writes/forgets,
// applied in one transaction, plus a one-line reply. Split out of user.ts to keep
// files under the 300-line rule; spread back into userRouter so the client calls
// trpc.user.talk.
//
// SAFETY (mirrors grocery-talk): the model NEVER sees or emits a database id — it
// forgets a memory only by the [N] number we assign, and the server resolves that
// number to a real id from the household's OWN memories, bounds-checked. A
// hallucinated ref maps to nothing. Allergy handling lives in the prompt/coerce.
//
// UNDO (feature #5): the mutation returns an `undo` payload (the BEFORE values of
// every preference field it changed + the ids it wrote/deactivated) so the client
// reverses a capture by reusing existing mutations — updatePreferences with the
// before-values, memory.deactivate the written ones, memory.reactivate the forgot
// ones. No bespoke undo endpoint.
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { aiProcedure } from "../init";
import { userPreferences, aiMemories } from "@/server/db/schema";
import {
  applyPreferencesTalkOps,
  talkToPreferencesChef,
  type PreferencesState,
} from "@/server/ai/tasks/preferences-talk";
import { describeCaught, fieldsTouchedBy } from "@/lib/onboarding/caught";

export const userTalkMutations = {
  talk: aiProcedure
    .input(
      z.object({
        request: z.string().trim().min(1).max(500),
        // Provenance for anything this call remembers. Defaults to "explicit"
        // (the You tab's Talk-to-Chef sheet — "you told me"). The onboarding
        // interview's per-question text field passes "onboarding" so its
        // captures read as "you told me when we started" in the ledger, matching
        // the memories finishOnboarding writes. Deliberately NOT free-form: only
        // these two provenances can be claimed by a caller.
        sourceType: z.enum(["explicit", "onboarding"]).default("explicit"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prefs = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      // Active memories, numbered 1-based. refByNumber maps the number we show the
      // model back to the real row — the model only ever sees numbers.
      const memRows = await ctx.db
        .select({ id: aiMemories.id, content: aiMemories.content })
        .from(aiMemories)
        .where(
          and(
            eq(aiMemories.householdId, ctx.householdId),
            eq(aiMemories.isActive, true)
          )
        )
        .orderBy(desc(aiMemories.updatedAt))
        .limit(50);

      const refByNumber = new Map<number, string>();
      const snapMemories = memRows.map((m, i) => {
        const ref = i + 1;
        refByNumber.set(ref, m.id);
        return { ref, content: m.content };
      });

      // Originals (row values or schema defaults) — the baseline for change
      // detection AND the undo payload.
      const orig: PreferencesState = {
        dietaryFramework: prefs?.dietaryFramework ?? "omnivore",
        restrictions: [...((prefs?.restrictions as string[] | null) ?? [])],
        dislikes: [...((prefs?.dislikes as string[] | null) ?? [])],
        householdSize: prefs?.householdSize ?? 2,
        maxCookTimeWeeknight: prefs?.maxCookTimeWeeknight ?? 45,
        maxCookTimeWeekend: prefs?.maxCookTimeWeekend ?? 90,
        cuisinePreferences: [...((prefs?.cuisinePreferences as string[] | null) ?? [])],
      };

      const { reply, ops } = await talkToPreferencesChef(
        { ...orig, memories: snapMemories },
        input.request
      );

      const { nextPatch, undoPatch, remember, forgetRefs } =
        applyPreferencesTalkOps(orig, ops);

      // Resolve the model's [N] refs to real ids WE own; ignore anything a ref
      // doesn't legitimately map to (dedup so one ref can't be double-counted).
      const forgetIds = [
        ...new Set(
          forgetRefs.map((ref) => refByNumber.get(ref)).filter((id): id is string => !!id)
        ),
      ];

      const prefsChanged = Object.keys(nextPatch).length > 0;
      const wroteMemoryIds: string[] = [];
      const deactivatedMemoryIds: string[] = [];

      await ctx.db.transaction(async (tx) => {
        if (prefsChanged) {
          await tx
            .insert(userPreferences)
            .values({
              userId: ctx.user.id,
              householdId: ctx.householdId,
              ...nextPatch,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: userPreferences.userId,
              set: { ...nextPatch, updatedAt: new Date() },
            });
        }

        for (const mem of remember) {
          const [row] = await tx
            .insert(aiMemories)
            .values({
              householdId: ctx.householdId,
              userId: ctx.user.id,
              content: mem.content,
              category: mem.category,
              sourceType: input.sourceType,
            })
            .returning({ id: aiMemories.id });
          if (row) wroteMemoryIds.push(row.id);
        }

        if (forgetIds.length > 0) {
          const done = await tx
            .update(aiMemories)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                inArray(aiMemories.id, forgetIds),
                eq(aiMemories.householdId, ctx.householdId)
              )
            )
            .returning({ id: aiMemories.id });
          for (const r of done) deactivatedMemoryIds.push(r.id);
        }
      });

      return {
        reply,
        // Item-by-item labels for what this message actually changed. The
        // onboarding interview's "what I caught" tray renders these; the You
        // tab ignores them and keeps using `reply`.
        caught: describeCaught(orig, nextPatch, remember.map((m) => m.content)),
        // Which typed fields this message spoke to. Read off the ops, not the
        // diff: a caller cannot infer this from the row afterwards, because
        // `dietary_framework` defaults to "omnivore" — so any write at all
        // makes the row claim a dietary answer nobody gave, while a genuine
        // correction back TO omnivore produces no diff at all.
        changed: fieldsTouchedBy(ops),
        applied: {
          prefsChanged,
          remembered: wroteMemoryIds.length,
          forgot: deactivatedMemoryIds.length,
        },
        undo: {
          preferences: undoPatch,
          wroteMemoryIds,
          deactivatedMemoryIds,
        },
      };
    }),
};

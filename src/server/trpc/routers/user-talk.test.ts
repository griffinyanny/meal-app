import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { router } from "../init";
import { userTalkMutations } from "./user-talk";
import { aiMemories } from "@/server/db/schema";
import type { Context } from "../init";
import type { PreferencesTalkResult } from "@/server/ai/tasks/preferences-talk";

// Mock only the AI call; keep the pure applyPreferencesTalkOps real so this test
// exercises the true apply → persist → undo wiring.
vi.mock("@/server/ai/tasks/preferences-talk", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/ai/tasks/preferences-talk")>();
  return { ...actual, talkToPreferencesChef: vi.fn() };
});

import { talkToPreferencesChef } from "@/server/ai/tasks/preferences-talk";
const mockTalk = vi.mocked(talkToPreferencesChef);

// Relax the AI rate limiter (aiProcedure) so the caller reaches the handler.
vi.mock("@/server/ratelimit", () => ({
  checkAiRateLimit: () => ({ allowed: true }),
  checkAiBackgroundRateLimit: () => ({ allowed: true }),
  consumeDailyAiBudget: async () => ({ allowed: true }),
}));

const talkRouter = router(userTalkMutations);

// ── DB mock ────────────────────────────────────────────────────────────────
interface SelectChain {
  from: () => SelectChain;
  where: () => SelectChain;
  orderBy: () => SelectChain;
  limit: () => Promise<unknown[]>;
}
function selectChain(rows: unknown[]): SelectChain {
  const chain: SelectChain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain;
}

interface TalkDbConfig {
  prefs: unknown;
  memRows: Array<{ id: string; content: string }>;
  insertMemReturning: Array<{ id: string }>;
  updateMemReturning: Array<{ id: string }>;
}

function createTalkDb(cfg: TalkDbConfig) {
  const captured: { prefsSet?: Record<string, unknown> } = {};

  const tx = {
    insert: (table: unknown) => ({
      values: () => ({
        onConflictDoUpdate: (arg: { set: Record<string, unknown> }) => {
          captured.prefsSet = arg.set;
          return Promise.resolve();
        },
        returning: () =>
          Promise.resolve(table === aiMemories ? cfg.insertMemReturning : []),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve(cfg.updateMemReturning),
        }),
      }),
    }),
  };

  const db = {
    query: {
      householdMembers: {
        findFirst: vi.fn().mockResolvedValue({ householdId: "hh-1" }),
      },
      userPreferences: { findFirst: vi.fn().mockResolvedValue(cfg.prefs) },
    },
    select: vi.fn(() => selectChain(cfg.memRows)),
    transaction: vi.fn(async (cb: (t: typeof tx) => Promise<void>) => cb(tx)),
    __captured: captured,
  };
  return db;
}

const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  email: "griffin@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
};

function buildCtx(db: ReturnType<typeof createTalkDb>, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

const DEFAULT_PREFS = {
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  dislikes: [],
  householdSize: 2,
  maxCookTimeWeeknight: 45,
  maxCookTimeWeekend: 90,
  cuisinePreferences: [],
};

function talkResult(ops: PreferencesTalkResult["ops"], reply = "ok"): PreferencesTalkResult {
  return { reply, ops };
}

describe("user.talk", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an unauthenticated request", async () => {
    const db = createTalkDb({
      prefs: DEFAULT_PREFS,
      memRows: [],
      insertMemReturning: [],
      updateMemReturning: [],
    });
    const caller = talkRouter.createCaller(buildCtx(db, null));
    await expect(caller.talk({ request: "hi" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("persists a captured allergy and returns the before-value for undo", async () => {
    mockTalk.mockResolvedValue(
      talkResult(
        [{ kind: "add_avoid", value: "gluten", isAllergy: true }],
        "Noted the gluten allergy."
      )
    );
    const db = createTalkDb({
      prefs: DEFAULT_PREFS,
      memRows: [],
      insertMemReturning: [],
      updateMemReturning: [],
    });
    const caller = talkRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.talk({ request: "I'm allergic to gluten" });

    expect(result.reply).toBe("Noted the gluten allergy.");
    expect(result.applied.prefsChanged).toBe(true);
    // Persisted the allergy-marked restriction…
    expect(db.__captured.prefsSet?.restrictions).toEqual([
      "shellfish (allergy)",
      "gluten (allergy)",
    ]);
    // …and the undo carries the original array back.
    expect(result.undo.preferences.restrictions).toEqual(["shellfish (allergy)"]);
  });

  it("resolves a forget ref to a real id and writes a remembered memory", async () => {
    mockTalk.mockResolvedValue(
      talkResult([
        { kind: "forget", ref: 1 },
        { kind: "remember", value: "Likes it spicy", category: "preference" },
      ])
    );
    const db = createTalkDb({
      prefs: undefined, // new user → defaults; no pref op here
      memRows: [
        { id: "mem-1", content: "Eases off heavy cream sauces." },
        { id: "mem-2", content: "Does Taco Tuesday." },
      ],
      insertMemReturning: [{ id: "mem-new" }],
      updateMemReturning: [{ id: "mem-1" }],
    });
    const caller = talkRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.talk({ request: "forget the cream note; I like spicy" });

    expect(result.applied.prefsChanged).toBe(false);
    expect(result.applied.remembered).toBe(1);
    expect(result.applied.forgot).toBe(1);
    expect(result.undo.wroteMemoryIds).toEqual(["mem-new"]);
    expect(result.undo.deactivatedMemoryIds).toEqual(["mem-1"]);
  });

  it("ignores a forget ref that maps to no owned memory (id-safety)", async () => {
    mockTalk.mockResolvedValue(talkResult([{ kind: "forget", ref: 99 }]));
    const db = createTalkDb({
      prefs: DEFAULT_PREFS,
      memRows: [{ id: "mem-1", content: "only one" }],
      insertMemReturning: [],
      updateMemReturning: [],
    });
    const caller = talkRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.talk({ request: "forget nonsense" });

    expect(result.applied.forgot).toBe(0);
    expect(result.undo.deactivatedMemoryIds).toEqual([]);
  });
});

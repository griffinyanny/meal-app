import { describe, it, expect, vi, beforeEach } from "vitest";
import { harvestCookedRecipes } from "./harvest-cooked";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/server/db/schema";

const HID = "household-1";
const NOW = new Date("2026-07-21T09:00:00Z");

// A select chain that resolves to `rows` after the fluent group-by builder.
function selectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = vi.fn(self);
  chain.innerJoin = vi.fn(self);
  chain.where = vi.fn(self);
  chain.groupBy = vi.fn(() => Promise.resolve(rows));
  return chain;
}

// One update chain whose .returning() resolves to the guarded result. The guard
// (WHERE lastCookedAt IS NULL OR < cookedAt) is a DB predicate, so tests drive it
// by handing each update a preset returning value via the queue.
function updateChainQueue(returnings: unknown[][]) {
  const queue = [...returnings];
  const set = vi.fn();
  const factory = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.set = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.returning = vi.fn(() => Promise.resolve(queue.shift() ?? []));
    return chain;
  });
  return { factory, set };
}

function makeDb(rows: unknown[], updateReturnings: unknown[][]) {
  const { factory } = updateChainQueue(updateReturnings);
  const db = {
    select: vi.fn(() => selectChain(rows)),
    update: factory,
  };
  return { db: db as unknown as PostgresJsDatabase<typeof schema>, updateFactory: factory, select: db.select };
}

describe("harvestCookedRecipes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps each recipe that has a past confirmed slot", async () => {
    const { db, updateFactory } = makeDb(
      [
        { recipeId: "r1", lastDate: "2026-07-12" },
        { recipeId: "r2", lastDate: "2026-07-05" },
      ],
      [[{ id: "r1" }], [{ id: "r2" }]]
    );

    const stamped = await harvestCookedRecipes(db, HID, NOW);

    expect(stamped).toBe(2);
    expect(updateFactory).toHaveBeenCalledTimes(2);
  });

  it("returns 0 and writes nothing when there are no past confirmed slots", async () => {
    const { db, updateFactory } = makeDb([], []);
    const stamped = await harvestCookedRecipes(db, HID, NOW);
    expect(stamped).toBe(0);
    expect(updateFactory).not.toHaveBeenCalled();
  });

  it("does not count a recipe whose guarded update matched nothing (already current)", async () => {
    // The guard (lastCookedAt already >= this date) makes returning() empty —
    // this is the idempotent path across repeated list refetches.
    const { db } = makeDb([{ recipeId: "r1", lastDate: "2026-07-12" }], [[]]);
    const stamped = await harvestCookedRecipes(db, HID, NOW);
    expect(stamped).toBe(0);
  });

  it("skips malformed rows (null recipeId or lastDate) without updating", async () => {
    const { db, updateFactory } = makeDb(
      [
        { recipeId: null, lastDate: "2026-07-12" },
        { recipeId: "r2", lastDate: null },
      ],
      []
    );
    const stamped = await harvestCookedRecipes(db, HID, NOW);
    expect(stamped).toBe(0);
    expect(updateFactory).not.toHaveBeenCalled();
  });

  it("stamps lastCookedAt to noon-UTC of the slot's calendar day", async () => {
    let capturedSet: Record<string, unknown> | undefined;
    const db = {
      select: vi.fn(() => selectChain([{ recipeId: "r1", lastDate: "2026-07-12" }])),
      update: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.set = vi.fn((v: Record<string, unknown>) => {
          capturedSet = v;
          return chain;
        });
        chain.where = vi.fn(() => chain);
        chain.returning = vi.fn(() => Promise.resolve([{ id: "r1" }]));
        return chain;
      }),
    } as unknown as PostgresJsDatabase<typeof schema>;

    await harvestCookedRecipes(db, HID, NOW);

    expect((capturedSet?.lastCookedAt as Date).toISOString()).toBe(
      "2026-07-12T12:00:00.000Z"
    );
    // Cooking graduates the recipe out of the drafts tier so its history is durable.
    expect(capturedSet?.sourcePlanId).toBeNull();
  });
});

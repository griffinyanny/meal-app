import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { memoryRouter } from "./memory";
import type { Context } from "../init";

// Chainable mock for db.update(t).set(v).where(w).returning(cols). Thenable at the
// end so an awaited chain resolves; returning() yields the canned rows.
type UpdateChain = {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeUpdateChain(returning: unknown[]): UpdateChain {
  const chain = {} as UpdateChain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returning));
  return chain;
}

interface MockDb {
  query: { householdMembers: { findFirst: ReturnType<typeof vi.fn> } };
  update: ReturnType<typeof vi.fn>;
  __chains: UpdateChain[];
}

function createMockDb(returning: unknown[] = []): MockDb {
  const chains: UpdateChain[] = [];
  return {
    query: {
      householdMembers: {
        findFirst: vi.fn().mockResolvedValue({ householdId: "hh-1" }),
      },
    },
    update: vi.fn(() => {
      const c = makeUpdateChain(returning);
      chains.push(c);
      return c;
    }),
    __chains: chains,
  };
}

const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  email: "griffin@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
};

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

const MEM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("memoryRouter.deactivate", () => {
  let db: MockDb;
  beforeEach(() => {
    db = createMockDb([{ id: MEM_ID }]);
  });

  it("rejects an unauthenticated request without touching the database", async () => {
    const caller = memoryRouter.createCaller(buildCtx(db, null));
    await expect(caller.deactivate({ memoryId: MEM_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a user with no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = memoryRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.deactivate({ memoryId: MEM_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("flips isActive off and returns the touched id", async () => {
    const caller = memoryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.deactivate({ memoryId: MEM_ID });

    expect(result).toEqual({ id: MEM_ID });
    expect(db.__chains[0].set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false })
    );
  });

  it("returns id:null when nothing matched (idempotent / wrong household)", async () => {
    db = createMockDb([]); // returning() yields no rows
    const caller = memoryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.deactivate({ memoryId: MEM_ID });
    expect(result).toEqual({ id: null });
  });
});

describe("memoryRouter.reactivate", () => {
  it("flips isActive back on (undo path)", async () => {
    const db = createMockDb([{ id: MEM_ID }]);
    const caller = memoryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.reactivate({ memoryId: MEM_ID });

    expect(result).toEqual({ id: MEM_ID });
    expect(db.__chains[0].set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true })
    );
  });
});

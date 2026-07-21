// Shared mock-db harness for the grocery router tests. Mocks only the external
// boundary (the Drizzle/Supabase db) per the project rule; the tRPC middleware
// (household scoping, the aiProcedure budget upsert) runs for real against it.
// Returning rows are keyed by table so a single call can touch several tables
// (e.g. the aiProcedure budget upsert into aiUsageDaily alongside a grocery write).
import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { aiUsageDaily } from "@/server/db/schema";
import type { Context } from "../init";

export type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeSelectChain(resultsByTable: Map<unknown, unknown[]>): Chain {
  let table: unknown;
  const chain = {} as Chain;
  chain.from = vi.fn((t: unknown) => {
    table = t;
    return chain;
  });
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resultsByTable.get(table) ?? []).then(resolve, reject)) as Chain["then"];
  return chain;
}

function makeWriteChain(table: unknown, returningByTable: Map<unknown, unknown[]>): Chain {
  const chain = {} as Chain;
  const rows = () => returningByTable.get(table) ?? [];
  chain.set = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(rows()));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(rows()).then(resolve, reject)) as Chain["then"];
  return chain;
}

export interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    groceryLists: { findFirst: ReturnType<typeof vi.fn> };
    groceryItems: { findFirst: ReturnType<typeof vi.fn> };
    stapleItems: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __updateReturning: Map<unknown, unknown[]>;
  __insertReturning: Map<unknown, unknown[]>;
  __deleteReturning: Map<unknown, unknown[]>;
}

export function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const updateReturning = new Map<unknown, unknown[]>();
  const insertReturning = new Map<unknown, unknown[]>();
  const deleteReturning = new Map<unknown, unknown[]>();
  // Every aiProcedure call consumes the daily budget (an upsert into aiUsageDaily
  // that reads back the post-increment count) — default comfortably under the cap.
  insertReturning.set(aiUsageDaily, [{ calls: 1 }]);

  const db: MockDb = {
    query: {
      householdMembers: { findFirst: vi.fn() },
      groceryLists: { findFirst: vi.fn() },
      groceryItems: { findFirst: vi.fn() },
      stapleItems: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    update: vi.fn((t: unknown) => makeWriteChain(t, updateReturning)),
    insert: vi.fn((t: unknown) => makeWriteChain(t, insertReturning)),
    delete: vi.fn((t: unknown) => makeWriteChain(t, deleteReturning)),
    // Run the transaction body against this same mock db.
    transaction: vi.fn((cb: (tx: MockDb) => unknown) => Promise.resolve(cb(db))),
    __selectResults: selectResults,
    __updateReturning: updateReturning,
    __insertReturning: insertReturning,
    __deleteReturning: deleteReturning,
  };
  return db;
}

export function makeUser(id: string): User {
  return {
    id,
    aud: "authenticated",
    email: `${id}@example.com`,
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
}

export function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

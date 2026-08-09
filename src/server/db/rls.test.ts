import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// RLS CI check (required by .claude/rules/drizzle-schema.md): every table
// created anywhere in the migration chain must have ENABLE ROW LEVEL SECURITY
// and at least one CREATE POLICY somewhere in the chain. Static analysis of
// the SQL files — no database connection — so it runs on every test pass and
// fails the moment a new table ships without RLS.
//
// ⚠️ WHICH DOOR THIS GUARDS, because the file name reads wider than the file
// (measured S67, 1F/D — see `.claude/rules/drizzle-schema.md` → "Two doors").
//
// THE DATA HAS TWO DOORS AND THIS GUARDS ONE OF THEM.
//
//   1. PostgREST — `<ref>.supabase.co/rest/v1/*` with the anon key, which is
//      inlined in the client bundle BY DESIGN and readable by anyone. Held by
//      RLS and by nothing else. **This is the door these assertions cover, and
//      it is genuinely load-bearing**: measured against production, the anon key
//      returns `200` with **0 rows** on households, grocery_items, recipes,
//      ai_memories and user_preferences.
//
//   2. The app's own connection — Drizzle → pooler → the `postgres` role.
//      **RLS DOES NOT APPLY TO IT**, for three independent reasons measured
//      against the real database: `rolbypassrls = true`, that role OWNS all 12
//      tables, and `FORCE ROW LEVEL SECURITY` is off on every one. With no auth
//      context at all, that connection reads every row in the database.
//
// So a green run here says NOTHING about the app's own queries. The layer
// holding door 2 is the tRPC one — `protectedProcedure` plus an explicit
// `householdId` filter on every query — and **RLS is not a backstop for a
// missing `WHERE householdId`.** It cannot be, while the app connects as the
// owning role. Anyone reading a passing `rls.test.ts` as "the data is protected"
// is reading a true statement about the wrong door.
//
// ⚠️ AND THE OBVIOUS HARDENING IS A TRAP — stated here so nobody files it as an
// easy win. `ALTER TABLE … FORCE ROW LEVEL SECURITY` would subject the app's own
// connection to the policies, and every policy resolves through
// `is_household_member()`, which reads a JWT claim that connection does not
// carry. **Every query in the app would return zero rows.** Making RLS a real
// backstop means setting the claim per request (`set local request.jwt.claims`)
// on a pooled connection — an architectural change, not a toggle.

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function readMigrationChain(): string {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function createdTables(sql: string): string[] {
  return [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/gi)].map(
    (m) => m[1]
  );
}

describe("row-level security migration coverage", () => {
  const chain = readMigrationChain();
  const tables = createdTables(chain);

  it("should find tables in the migration chain", () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables)("table %s has ENABLE ROW LEVEL SECURITY", (table) => {
    const enable = new RegExp(
      `ALTER TABLE "?${table}"? ENABLE ROW LEVEL SECURITY`,
      "i"
    );
    expect(chain).toMatch(enable);
  });

  it.each(tables)("table %s has at least one CREATE POLICY", (table) => {
    const policy = new RegExp(`CREATE POLICY "?[\\w]+"? ON "?${table}"?`, "i");
    expect(chain).toMatch(policy);
  });

  it("is_household_member() is defined with a pinned search_path", () => {
    expect(chain).toMatch(/FUNCTION public\.is_household_member/i);
    expect(chain).toMatch(/SET search_path = ''/i);
  });
});

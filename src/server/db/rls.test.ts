import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// RLS CI check (required by .claude/rules/drizzle-schema.md): every table
// created anywhere in the migration chain must have ENABLE ROW LEVEL SECURITY
// and at least one CREATE POLICY somewhere in the chain. Static analysis of
// the SQL files — no database connection — so it runs on every test pass and
// fails the moment a new table ships without RLS.

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

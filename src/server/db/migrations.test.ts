import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A source-level guard on the generated SQL (1F/D, migration safety).
//
// ⚠️ THE RISK THIS EXISTS FOR: `drizzle-kit generate` CANNOT TELL A RENAME FROM
// A DROP-PLUS-ADD. Rename a column in `schema/` and it emits `DROP COLUMN` +
// `ADD COLUMN`, which silently destroys that column's data — and `db:migrate`
// applies it straight to the project holding the household's real data, with no
// automatic backup on Supabase Free. One bad generated migration, silent and
// unrecoverable.
//
// It has never bitten because all eleven migrations are purely additive. That
// is a young schema, not a control: nothing in the toolchain would have stopped
// it, and the first genuinely destructive change (V1.5's household sharing) is
// the one that will be written by a generator rather than by hand.
//
// A staging database was explicitly rejected and would not have helped —
// rehearsing a bad migration and then applying the same bad migration to prod
// loses the data either way. The thing that helps is reading the SQL before
// applying it, and this turns "we remembered to read it" into "the gauntlet
// will not let it through."
//
// Same idiom as `palette.test.ts` (scrapes hexes with an allow-list),
// `config.test.ts` (scrapes `maxDuration` out of route source) and
// `globals.test.ts` (fails on hand-written vendor prefixes): the only layer
// that can see a string is a layer that reads the source.

const MIGRATIONS_DIR = join(__dirname, "migrations");

// ⚠️ Opt-out, and it is deliberately a sentence you have to type. A migration
// that genuinely must destroy something carries this marker with a reason, so
// the destruction is a decision in the diff rather than something a generator
// did on your behalf while you read the schema file instead of the SQL.
const ACK = /--\s*ACKNOWLEDGED-DESTRUCTIVE:\s*\S+/i;

// ⚠️ What is deliberately NOT flagged, and why — because S52's rule is that an
// unexplained exemption outlives the reason for it:
//
//   DROP POLICY IF EXISTS  — 0002_rls.sql carries eleven. They are idempotent
//                            re-creates of RLS policies; the row data is
//                            untouched and the policy is recreated two lines
//                            later. Flagging them would red the suite on day
//                            one, and a guard that cries wolf teaches you to
//                            edit the expectation (S59).
//   ALTER COLUMN … DROP DEFAULT — 0010 does exactly this. It removes a default
//                            for FUTURE rows; existing values are untouched.
//   DROP CONSTRAINT / DROP INDEX — recoverable by re-running a migration. Not
//                            data loss.
//
// The patterns below are anchored so none of the three can match by accident:
// `DROP DEFAULT` does not contain `DROP COLUMN`, and `DROP POLICY` is not
// `DROP TABLE`.
const DATA_DESTROYING: ReadonlyArray<readonly [string, RegExp]> = [
  ["DROP TABLE", /\bDROP\s+TABLE\b/i],
  ["DROP COLUMN", /\bDROP\s+COLUMN\b/i],
  ["DROP SCHEMA", /\bDROP\s+SCHEMA\b/i],
  ["TRUNCATE", /\bTRUNCATE\b/i],
  ["DELETE FROM", /\bDELETE\s+FROM\b/i],
  // A type change coerces every existing value, and Postgres is happy to
  // truncate a varchar or round a numeric while doing it.
  ["ALTER COLUMN … TYPE", /\bALTER\s+COLUMN\b[^;]*\bSET\s+DATA\s+TYPE\b/i],
];

interface Migration {
  name: string;
  sql: string;
}

function migrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8"),
    }));
}

/** `file:line — statement` for every line matching `pattern`, minus acknowledged files. */
function offenders(pattern: RegExp): string[] {
  return migrations().flatMap(({ name, sql }) => {
    if (ACK.test(sql)) return [];
    return sql
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => !line.startsWith("--") && pattern.test(line))
      .map(({ line, n }) => `${name}:${n} — ${line.slice(0, 90)}`);
  });
}

const HOW_TO_FIX =
  "\n\nIf this is a RENAME, drizzle-kit generated it as a drop-plus-add and it WILL destroy that " +
  "column's data — rewrite it as expand/contract (add nullable → backfill → switch reads → drop " +
  "in a LATER migration). If the destruction is genuinely intended, take a `pg_dump` of production " +
  "FIRST and then add `-- ACKNOWLEDGED-DESTRUCTIVE: <reason>` at the top of the file. " +
  "⚠️ This test cannot verify that a dump was taken; the marker is your statement that it was. " +
  "See .claude/rules/drizzle-schema.md.\n\nOffenders: ";

describe("migration safety", () => {
  // ⚠️ First, because a broken path or a renamed directory would make every
  // assertion below pass against nothing — a clean report from a sweep that
  // swept no files. S54's SH2, in a different costume.
  it("should actually be scanning the migrations directory", () => {
    const found = migrations();
    expect(found.length).toBeGreaterThan(0);
    expect(found.map((m) => m.name)).toContain("0000_baseline.sql");
  });

  for (const [label, pattern] of DATA_DESTROYING) {
    it(`should have no unacknowledged ${label}`, () => {
      expect(offenders(pattern), `${label} destroys data.${HOW_TO_FIX}`).toEqual(
        []
      );
    });
  }

  // The expand/contract half that is checkable from the string. Both of these
  // ABORT the migration on a table that already has rows, which on Supabase Free
  // means a half-applied deploy against real data rather than a clean failure in
  // a rehearsal.
  it("should have no ADD COLUMN … NOT NULL without a DEFAULT", () => {
    // `ADD COLUMN "x" text DEFAULT 'none' NOT NULL` is fine and 0004 has three
    // of them — the default is what backfills the existing rows. It is the
    // undefaulted form that fails.
    const bad = /\bADD\s+COLUMN\b(?![^;]*\bDEFAULT\b)[^;]*\bNOT\s+NULL\b/i;
    expect(
      offenders(bad),
      "A NOT NULL column with no DEFAULT cannot be added to a table that already " +
        "has rows. Expand/contract: add it nullable, backfill, then tighten in a " +
        `later migration.${HOW_TO_FIX}`
    ).toEqual([]);
  });

  it("should have no ALTER COLUMN … SET NOT NULL", () => {
    expect(
      offenders(/\bALTER\s+COLUMN\b[^;]*\bSET\s+NOT\s+NULL\b/i),
      "Promoting an existing nullable column to NOT NULL aborts if any row holds " +
        "a null. It is only safe as the CONTRACT step, in its own migration, after " +
        `a backfill has been applied and verified.${HOW_TO_FIX}`
    ).toEqual([]);
  });
});

---
globs: src/server/db/schema/**/*.ts
---

# Drizzle Schema Rules

- Every table must have: `household_id` column (FK to households), `created_at` with `defaultNow()`, `updated_at`.
- Every table must have a corresponding RLS policy using `is_household_member(household_id)`.
- UUIDs for all primary keys (no serial/auto-increment). Use `uuid().primaryKey().defaultRandom()`.
- JSONB columns must have a corresponding Zod schema for runtime validation. Define the Zod schema in the same file or a co-located types file.
- Schema changes require a Drizzle migration (`npm run db:generate`). Never use `db push` against the production database.
- When adding a new table, also add the RLS CI check assertion for that table.
- Split schema files by domain (recipes.ts, plans.ts, grocery.ts, users.ts). Keep each under 300 lines.
- Index foreign keys and any column used in WHERE clauses. Add GIN index for JSONB columns that need querying.

## Expand/contract — the standing discipline for every schema change (1F/D)

⚠️ **`drizzle-kit generate` cannot tell a rename from a drop-plus-add.** Rename a column in `schema/` and
it emits `DROP COLUMN` + `ADD COLUMN`. That silently destroys the column's data, `db:migrate` applies it
to the project holding real household data, and **Supabase Free takes no automatic backup**. One bad
generated migration, silent and unrecoverable. It has never bitten only because all eleven migrations so
far are purely additive — **a young schema, not a control.**

**ALWAYS READ THE GENERATED SQL.** `npm run db:generate` writes a file; open it before `db:migrate`. The
schema diff you intended and the SQL drizzle produced are two different artifacts, and only one of them
runs against production.

**No migration may both remove something and depend on its absence.** Split every destructive change into
four steps, each its own migration or deploy:

1. **Expand** — add the new column/table, **nullable, with a default where one makes sense**.
2. **Backfill** — populate it. A data migration, verified before step 3.
3. **Switch reads** — deploy code that reads the new shape and still tolerates the old.
4. **Contract** — drop the old column, in a *later* migration, once nothing reads it.

The point is that rollback becomes a **code deploy** rather than a data restore. Steps 1–3 are each
individually reversible; only step 4 is not, which is why it stands alone.

⚠️ **`ADD COLUMN … NOT NULL` with no `DEFAULT` aborts on any table that already has rows**, and so does
`ALTER COLUMN … SET NOT NULL` if a single row holds a null. Both are expand/contract violations wearing an
additive costume. `migrations.test.ts` fails on both.

**Before any acknowledged-destructive migration, take a `pg_dump` of production first:**

```
pg_dump "$PRODUCTION_DATABASE_URL" --no-owner --no-privileges -Fc \
  -f "backup-$(date +%Y%m%d-%H%M).dump"
```

⚠️ **This is the step a staging database would NOT have given us** (that option was considered and
rejected, `open-questions.md`): rehearsing a bad migration and then applying the same bad migration to
prod loses the data either way. The dump is the only step that helps at the moment it matters.

**Enforcement:** `src/server/db/migrations.test.ts` scrapes every `migrations/*.sql` for data-destroying
statements and fails the gauntlet unless the file carries `-- ACKNOWLEDGED-DESTRUCTIVE: <reason>`.
⚠️ **It cannot verify that a dump was taken** — the marker is your statement that it was, which is why it
is a sentence you have to type rather than a flag you can pass. It deliberately does **not** flag
`DROP POLICY IF EXISTS`, `ALTER COLUMN … DROP DEFAULT`, `DROP CONSTRAINT` or `DROP INDEX`; the reasons are
in the file, because an unexplained exemption outlives the reason for it (S52).

**Already done once, instinctively, and now written down:** migration `0010` dropped a *default* and
deliberately did **not** backfill the existing rows to null, because a genuine "2 adults, no kids" answer
is byte-identical to the default and nulling them would have destroyed real answers to fix a cosmetic
inconsistency. That reasoning was correct and existed only in a commit message.

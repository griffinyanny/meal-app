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
- ⚠️ **And know what that assertion does and does not buy you — see "Two doors" below.**
- Split schema files by domain (recipes.ts, plans.ts, grocery.ts, users.ts). Keep each under 300 lines.
- Index foreign keys and any column used in WHERE clauses. Add GIN index for JSONB columns that need querying.

## Two doors — which layer is actually load-bearing (1F/D · measured S67)

**The question Workstream D asked was "every table has a policy; would the app still be safe if one
layer were removed, and which one is actually holding?" It has a measured answer, and it is not the
comfortable one.**

**There are two doors into this data, each held by exactly ONE layer. Neither backstops the other.**

| Door | Who can knock | What holds it | Remove that layer and… |
|---|---|---|---|
| **PostgREST** — `<ref>.supabase.co/rest/v1/*` with the anon key, which **is inlined in the client bundle by design** and is readable by anyone who views source | anyone on the internet | **RLS, and only RLS** — 12 policies through `is_household_member()` | every row in every table becomes world-readable |
| **The app's own connection** — Drizzle → pooler → the `postgres` role | server code only | **the tRPC layer, and only the tRPC layer** — `protectedProcedure` + an explicit `householdId` filter on every query | one unscoped query reads across households, and **nothing notices** |

⚠️ **RLS DOES NOT APPLY TO THE APP'S OWN QUERIES.** Measured against the real database, three
independent reasons, any one of which is sufficient:

- the role the app connects as has **`rolbypassrls = true`**
- that role **owns all 12 tables**, and an owner bypasses RLS
- **`FORCE ROW LEVEL SECURITY` is off on all 12**

Empirically: with no auth context at all, that connection sees **every row** (12 tables, RLS enabled on
12, policies on 12 — and 2 households / 98 grocery_items visible). The other door was measured the same
way and **RLS genuinely holds it**: the anon key returns `200` with **0 rows** on households,
grocery_items, recipes, ai_memories and user_preferences.

**So neither layer is redundant, and neither is a fallback. They cover disjoint surfaces.** The belief
worth killing on sight is *"RLS will catch it if we forget a `WHERE householdId`."* **It will not, and it
cannot**, while the app connects as the owning role.

⚠️ **`rls.test.ts` is static analysis of migration SQL and guards the PostgREST door only.** Every
assertion in it is true; none of them says anything about the app's own queries. A passing run reads as
*"the data is protected"* and is a true statement about the wrong door.

⚠️ **DO NOT "FIX" THIS BY TURNING ON `FORCE ROW LEVEL SECURITY`.** It is the obvious hardening and it
would take the app down: every policy resolves through `is_household_member()`, which reads a JWT claim
the app's pooled connection does not carry, so **every query in the product would return zero rows.**
Making RLS a real backstop means setting `request.jwt.claims` per request on a pooled connection — an
architectural change with its own failure modes, not a toggle. Filed as a V1.5 consideration, not a
1F item.

**What this means when you add a table:** the RLS policy is still mandatory (it holds door 1), *and* the
router that reads it is the only thing holding door 2. Write the `householdId` filter as if there were
nothing underneath it, because there is nothing underneath it.

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

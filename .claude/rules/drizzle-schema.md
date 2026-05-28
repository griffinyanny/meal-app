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

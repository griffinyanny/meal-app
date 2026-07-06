// One-off: introduce drizzle migrations to the existing (db push'd) database.
// Marks 0000_baseline as already-applied (the live DB already has it), then runs
// the migrator, which applies only newer migrations (0001_plan_concepts onward).
// Run with: node --env-file=.env.local scripts/migrate-with-baseline.mjs
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import crypto from "node:crypto";
import fs from "node:fs";

const MIGRATIONS_DIR = "src/server/db/migrations";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const journal = JSON.parse(
  fs.readFileSync(`${MIGRATIONS_DIR}/meta/_journal.json`, "utf8")
);
const baseline = journal.entries.find((e) => e.tag === "0000_baseline");
if (!baseline) {
  console.error("0000_baseline not found in journal");
  process.exit(1);
}
const baselineSql = fs.readFileSync(`${MIGRATIONS_DIR}/0000_baseline.sql`, "utf8");
const baselineHash = crypto.createHash("sha256").update(baselineSql).digest("hex");

const sql = postgres(url, { prepare: false, ssl: "require", max: 1 });

try {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
  if (n > 0) {
    console.log(`Migrations table already has ${n} row(s) — skipping baseline seed.`);
  } else {
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${baselineHash}, ${baseline.when})`;
    console.log(`Seeded 0000_baseline as applied (created_at=${baseline.when}).`);
  }

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  console.log("Migrator finished — pending migrations applied.");

  const applied = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log("Applied migrations:", applied.length);

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'meal_plan_slots'
      AND column_name IN ('title','description','ingredient_preview','slot_tags','est_time_minutes','chips')
    ORDER BY column_name`;
  console.log(
    "1C columns now present:",
    cols.map((c) => c.column_name).join(", ") || "(none)"
  );
} finally {
  await sql.end();
}

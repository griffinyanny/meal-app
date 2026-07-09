// GENERIC harness utility — copyable to any Drizzle + postgres-js app.
// Builds a throwaway DB client for Node-side seeding/reset in E2E setup, using
// the same driver/SSL settings the app uses. Caller owns closing it.
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface SeedDb<TSchema extends Record<string, unknown>> {
  db: PostgresJsDatabase<TSchema>;
  close: () => Promise<void>;
}

export function makeSeedDb<TSchema extends Record<string, unknown>>(
  connectionString: string,
  schema: TSchema
): SeedDb<TSchema> {
  const client = postgres(connectionString, {
    prepare: false,
    ssl: "require",
    max: 1,
  });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end({ timeout: 5 }) };
}

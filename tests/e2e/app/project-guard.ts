// BUG-018 · WHICH Supabase project this harness may be pointed at, checked
// before anything opens a connection.
//
// `seed.ts` deletes rows over a direct Postgres connection, and its existing
// barrier — `assertTestHousehold` — is an IN-PROJECT one: the household must
// carry the sentinel name and have exactly one member, the test user. That is a
// real guard against writing to the wrong household. It is no guard at all
// against being pointed at the wrong PROJECT, which is the failure BUG-018
// actually names: a copied or half-edited `.env.local` on a second machine.
//
// So the allowed ref is COMMITTED, not configured. A guard that lives in
// `.env.local`, beside the URL it is guarding, cannot catch a bad `.env.local`.
// The ref is not a secret — it is the host in `NEXT_PUBLIC_SUPABASE_URL`, which
// ships to every browser that loads the app.
//
// It is an ALLOW-LIST rather than the is-this-production test the tracker named,
// and deliberately so: no property of a URL says "production", so inverting the
// question would make the guard fail OPEN on every project it did not recognise
// — the opposite of what it exists for. When a dedicated non-prod project
// exists, add its ref below; nothing else changes.

/** Every Supabase project the E2E harness is permitted to write to. */
export const ALLOWED_PROJECT_REFS: readonly string[] = ["hqwqzrzesvbscagfrlzi"];

/** `https://<ref>.supabase.co` → `<ref>`. */
export function refFromSupabaseUrl(url: string): string | null {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)(\/|$)/i.exec(url.trim());
  return match ? match[1].toLowerCase() : null;
}

/**
 * `<ref>` out of a Postgres connection string, in both shapes `.env.local` has
 * held: the pooler form, where the ref is a suffix on the username
 * (`postgres.<ref>@…pooler.supabase.com`), and the direct form, where it is a
 * label in the host (`…@db.<ref>.supabase.co`).
 */
export function refFromDatabaseUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    // An unencoded character in the password is the usual cause. Returning null
    // makes the caller refuse rather than guess.
    return null;
  }

  const pooled = /^postgres\.([a-z0-9]+)$/i.exec(decodeURIComponent(parsed.username));
  if (pooled) return pooled[1].toLowerCase();

  const direct = /^db\.([a-z0-9]+)\.supabase\.(co|in)$/i.exec(parsed.hostname);
  if (direct) return direct[1].toLowerCase();

  return null;
}

/**
 * Refuses to let the harness run unless both configured URLs name the same
 * allow-listed project. Throws — this is a destructive-write guard, so an
 * unrecognised project is a stop, never a warning.
 */
export function assertAllowedProject(supabaseUrl: string, databaseUrl: string): void {
  const fromApi = refFromSupabaseUrl(supabaseUrl);
  const fromDb = refFromDatabaseUrl(databaseUrl);

  if (!fromApi) {
    throw new Error(
      `project guard: could not read a Supabase project ref out of NEXT_PUBLIC_SUPABASE_URL — refusing to run.`
    );
  }
  if (!fromDb) {
    throw new Error(
      `project guard: could not read a Supabase project ref out of DATABASE_URL — refusing to run.`
    );
  }
  // A half-edited .env.local is the worst case of the three: the app would talk
  // to one project while the seeder deleted rows in another.
  if (fromApi !== fromDb) {
    throw new Error(
      `project guard: NEXT_PUBLIC_SUPABASE_URL names project "${fromApi}" but DATABASE_URL names "${fromDb}" — refusing to run.`
    );
  }
  if (!ALLOWED_PROJECT_REFS.includes(fromDb)) {
    throw new Error(
      `project guard: project "${fromDb}" is not in the harness allow-list [${ALLOWED_PROJECT_REFS.join(", ")}]. ` +
        `The seeder DELETES rows, so it will not run against a project it does not recognise. ` +
        `If this project is genuinely a test target, add its ref to ALLOWED_PROJECT_REFS in tests/e2e/app/project-guard.ts.`
    );
  }
}

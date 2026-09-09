import { createHash } from "node:crypto";

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
//
// It is an ALLOW-LIST rather than the is-this-production test the tracker named,
// and deliberately so: no property of a URL says "production", so inverting the
// question would make the guard fail OPEN on every project it did not recognise
// — the opposite of what it exists for.
//
// ⚠️ THE LIST HOLDS SHA-256 HASHES, NOT REFS (S70). The repo went public as a
// job-search artifact, and a plaintext ref here would hand every reader the
// project host — from which `/auth/v1/settings` is reachable, and signup is
// open. The ref is not a *secret* (it ships inlined in the client bundle of the
// deployed app), but publishing it in source removes the one step an attacker
// would otherwise have to take, so it is not free either.
//
// Hashing keeps the property the comment above is about: the allow-list is
// still COMMITTED, so a copied `.env.local` still cannot vote on whether it is
// allowed. A hash is a one-way check — the guard can confirm a ref belongs
// without the file naming it.
//
// To add a project: `node -e "console.log(require('crypto').createHash('sha256')
// .update('<ref>').digest('hex'))"` and append the result below.

/** sha256 of every Supabase project ref the E2E harness may write to. */
export const ALLOWED_PROJECT_REF_HASHES: readonly string[] = [
  "ec2e0a24e040c5aad457a0e707d0973777b0468a34b073161aa91ca6de9addc4",
];

/** The allow-list comparison, one-way. Refs are lowercased before hashing. */
export function hashProjectRef(ref: string): string {
  return createHash("sha256").update(ref.trim().toLowerCase()).digest("hex");
}

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
export function assertAllowedProject(
  supabaseUrl: string,
  databaseUrl: string,
  allowedHashes: readonly string[] = ALLOWED_PROJECT_REF_HASHES
): void {
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
  if (!allowedHashes.includes(hashProjectRef(fromDb))) {
    throw new Error(
      `project guard: project "${fromDb}" is not in the harness allow-list. ` +
        `The seeder DELETES rows, so it will not run against a project it does not recognise. ` +
        `If this project is genuinely a test target, add sha256("${fromDb}") to ` +
        `ALLOWED_PROJECT_REF_HASHES in tests/e2e/app/project-guard.ts.`
    );
  }
}

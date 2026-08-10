// Provisions the private `feedback` Storage bucket and its RLS policy (1F/E).
//
// Run once per Supabase project: `npm run storage:feedback`
// Idempotent — safe to re-run, and re-running is how a fresh project catches up.
//
// ⚠️ WHY A SCRIPT RATHER THAN A DRIZZLE MIGRATION. A bucket is a row in
// `storage.buckets`, a schema Supabase owns; the migration chain describes OUR
// schema, and drizzle-kit generates it by diffing `schema/`. Smuggling
// infrastructure into that chain means a hand-edited journal and a migration
// drizzle can neither generate nor verify. Infrastructure that lives outside the
// chain gets a script that says so, not a migration pretending otherwise.
//
// ⚠️ AND THIS IS THE ONE PLACE IN THE APP WHERE RLS IS GENUINELY LOAD-BEARING.
// `.claude/rules/drizzle-schema.md` → "Two doors" establishes that RLS does NOT
// filter the app's own Drizzle connection (`rolbypassrls`, owner role, FORCE
// off) — so on every other table the tRPC layer is the whole protection. An
// upload is different: it goes DIRECT from the browser to the Storage API with
// the anon key plus the user's JWT, which is **door 1**, and door 1 is held by
// RLS and nothing else. The policy below is not decorative, and the reflex
// "RLS doesn't protect us here" is wrong about this file specifically.
import postgres from "postgres";

const BUCKET = "feedback";

// A screenshot from an iPhone 15 Pro is ~2-4MB; a burst of them is still small.
// The cap exists to bound a pathological upload, not to police size.
const FILE_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;

// R1 ships `accept="image/*"` on the file input, and this is the server-side
// half of that. ⚠️ Widening to video is a two-place change on purpose: add the
// mime types here AND the accept attribute. Direct-to-Storage upload is what
// makes video possible at all (a server-proxied upload would hit Vercel's
// 4.5MB request-body limit), but nothing about R1 needs it yet.
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/heic"];

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: set -a; . ./.env.local; set +a");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false });

try {
  await sql`
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      ${BUCKET}, ${BUCKET}, false,
      ${FILE_SIZE_LIMIT_BYTES}, ${ALLOWED_MIME}
    )
    on conflict (id) do update set
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types
  `;

  // ⚠️ INSERT ONLY, DELIBERATELY. Nothing in the app ever reads an image back:
  // the table is write-only (E0 call 3) and the sweep resolves the object with
  // the service-role key from `.env.local`, which bypasses RLS. Granting SELECT
  // would widen the door for a capability no code uses. Each upload writes a
  // fresh UUID path, so there is no update or delete either.
  //
  // `(storage.foldername(name))[1]` is the first path segment — the caller's own
  // user id. `feedback.submit` enforces the SAME prefix rule server-side on the
  // path it is handed: this policy bounds what a caller can WRITE, and the
  // router bounds what they can make the sweep READ. Two checks because they
  // guard two different moments.
  // ⚠️ `sql.unsafe`, and the reason is Postgres rather than laziness: DDL cannot
  // take bind parameters, so `bucket_id = ${BUCKET}` inside CREATE POLICY fails
  // with 42P18 ("could not determine data type of parameter"). BUCKET is a
  // module constant in this file, never user input, so inlining it is safe —
  // but never reach for `unsafe` with a value that came from outside.
  await sql.unsafe(
    `drop policy if exists "feedback_insert_own_prefix" on storage.objects`
  );
  await sql.unsafe(`
    create policy "feedback_insert_own_prefix"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = '${BUCKET}'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  `);

  const [bucket] = await sql`
    select id, public, file_size_limit, allowed_mime_types
    from storage.buckets where id = ${BUCKET}
  `;
  const policies = await sql`
    select polname from pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname = 'feedback_insert_own_prefix'
  `;

  console.log("bucket:", bucket);
  console.log("policy:", policies.length === 1 ? "feedback_insert_own_prefix ✓" : "MISSING");
  if (bucket.public !== false || policies.length !== 1) {
    console.error("Verification failed — bucket is public or the policy is absent.");
    process.exit(1);
  }
} finally {
  await sql.end();
}

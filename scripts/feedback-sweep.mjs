// Session-start feedback sweep (1F/E, E0 calls 3 + 4 + 6/7).
//
//   npm run feedback:sweep              → print every unswept report
//   npm run feedback:sweep -- --mark ID [ID…]  → mark reports swept, after filing
//
// ⚠️ THIS IS THE WHOLE "INTEGRATION". E0 chose a Postgres table over Linear
// because the queue Linear was supposed to provide — an agent picking work up —
// is already how this repo works: Claude reads the docs at session start.
// Adding "read the feedback table" is a script, not an integration, and this is
// the script. The Linear graduation trigger moves to real users.
//
// ⚠️ WHAT CLAUDE DOES WITH THE OUTPUT — the claim-type split (E0 call 6+7).
// A submission is UNTYPED and may hold more than one claim: "the quantity editor
// drops the unit, and honestly we should let you type '2 lbs' directly" is a
// defect AND a product direction. Claim type is a property of a CLAIM, and a
// one-to-many relationship cannot live in a column on the parent — which is why
// there is no `type` column and why the sheet asks for no classification.
// Decompose each report into 1..N claims and route each one:
//
//   • A DEFECT, from EITHER user → file straight into docs/bug-tracker.md in the
//     normal format (repro + severity + address-by), carrying `FB-<short id>` so
//     the row traces back to the raw submission. The report is the decision.
//   • A PRODUCT DIRECTION from GRIFFIN → docs/idea-backlog.md with a phase tag.
//   • A PRODUCT DIRECTION from anyone else → idea-backlog's staging section with
//     a recommendation, for Griffin to ratify before it becomes work.
//
// The line is product OWNERSHIP, not credibility: Griffin owns what this product
// is, and that does not make another engineer's diagnosis worth less.
//
// Then mark the reports swept, or the next session files them all again.
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: set -a; . ./.env.local; set +a");
  process.exit(1);
}

const args = process.argv.slice(2);
const markIndex = args.indexOf("--mark");
const idsToMark = markIndex === -1 ? [] : args.slice(markIndex + 1).filter(Boolean);

const sql = postgres(DATABASE_URL, { prepare: false });

try {
  if (idsToMark.length > 0) {
    const marked = await sql`
      update feedback set status = 'swept', updated_at = now()
      where id = any(${idsToMark}::uuid[]) and status = 'new'
      returning id
    `;
    console.log(`Marked ${marked.length} report(s) swept.`);
    if (marked.length !== idsToMark.length) {
      console.log(
        `⚠️  ${idsToMark.length - marked.length} id(s) were already swept or not found.`
      );
    }
    process.exit(0);
  }

  // ⚠️ `aiMock` IS FILTERED; `environment` IS NOT. The mock only turns on under
  // `E2E_AI_MOCK=1`, so those rows are definitionally fixture-driven suite runs
  // and are never real feedback. Filtering on `environment = 'production'` would
  // be the tempting second filter and it is WRONG: Griffin testing against his
  // own laptop stamps `development`, and that is real feedback. Environment is
  // shown instead of filtered, so the reader judges rather than the query.
  // (The E2E suite also wipes this table — both, because either alone is one
  // edit from silence.)
  const rows = await sql`
    select f.id, f.body, f.image_path, f.payload, f.created_at, u.email
    from feedback f
    join users u on u.id = f.user_id
    where f.status = 'new'
      and coalesce((f.payload ->> 'aiMock')::boolean, false) = false
    order by f.created_at asc
  `;

  if (rows.length === 0) {
    console.log("No unswept feedback.");
    process.exit(0);
  }

  console.log(`## ${rows.length} unswept report(s)\n`);
  for (const r of rows) {
    const p = r.payload ?? {};
    console.log(`### FB-${String(r.id).slice(0, 8)}  ·  ${r.email}`);
    console.log(`- id: \`${r.id}\`  (pass this to --mark)`);
    console.log(`- filed: ${new Date(r.created_at).toISOString()}`);
    console.log(
      `- where: ${p.route ?? "?"} · ${p.standalone ? "installed PWA" : "browser tab"}` +
        ` · ${p.viewport?.width ?? "?"}×${p.viewport?.height ?? "?"}`
    );
    console.log(`- env: ${p.environment ?? "?"} · build: ${p.buildSha ?? "unknown"}`);
    // The join to session replay. Without it the recording exists and is
    // unfindable, which is the reason this field is in the payload at all.
    if (p.replayUrl) console.log(`- replay: ${p.replayUrl}`);
    if (p.sentryEventId) console.log(`- sentry event: ${p.sentryEventId}`);
    if (r.image_path) {
      console.log(`- screenshot: \`${r.image_path}\` in the private \`feedback\` bucket`);
      console.log(
        `  (signed URL: supabase.storage.from("feedback").createSignedUrl(path, 3600)` +
          ` with SUPABASE_SERVICE_ROLE_KEY from .env.local — it is local-only by design, BUG-068)`
      );
    }
    console.log(`\n> ${String(r.body).split("\n").join("\n> ")}\n`);

    const calls = Array.isArray(p.trpcCalls) ? p.trpcCalls : [];
    if (calls.length > 0) {
      console.log("Last calls before the report:");
      for (const c of calls) {
        console.log(
          `  ${c.ok ? "ok " : "ERR"}  ${String(c.path).padEnd(28)}` +
            ` ${String(c.durationMs).padStart(5)}ms   −${c.msBeforeCapture}ms`
        );
      }
      console.log("");
    }

    const panels = p.debugPanels ?? {};
    const panelKeys = Object.keys(panels);
    console.log(
      panelKeys.length > 0
        ? `Debug panels: ${panelKeys.join(", ")}\n\`\`\`json\n${JSON.stringify(panels, null, 2)}\n\`\`\``
        : "Debug panels: none published on this surface (only Plan and Groceries register one)."
    );
    console.log("\n---\n");
  }
} finally {
  await sql.end();
}

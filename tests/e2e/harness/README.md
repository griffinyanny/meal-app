# E2E Harness — reusable core + porting recipe

This `harness/` directory is the **generic, copyable** half of the E2E setup. It
knows nothing about meal-app. Everything meal-app-specific lives in `../app/` and
`../specs/`. To stand up the same kind of suite in another repo (FFOS, Leila's
Briefing — same Next.js + Supabase + Drizzle + Vercel shape), copy this directory
and write a thin app layer.

## What the core gives you

- **`supabase-session.ts`** — `mintSupabaseSession(cfg)` signs a dedicated test
  user in with the publishable key to get a REAL signed session, then
  `sessionToStorageState(cfg, session)` replays it through `@supabase/ssr` so the
  cookies are byte-identical to what the app writes. This is an auth bypass of the
  *UI*, not of security — the session passes real `getClaims()`/`getUser()`
  verification. On a cold start (user absent, unconfirmed, or password drifted) it
  bootstraps via public `signUp` + a SQL confirm/password-reset over
  `cfg.databaseUrl`. **It never calls GoTrue's `/auth/v1/admin/*` endpoints** —
  those reject the new `sb_secret_` keys outright (`403 bad_jwt: unrecognized JWT
  kid <nil>`, since the key isn't a JWT), so an admin-based bootstrap is dead code
  on any project using the new key format. The harness needs no service-role key
  at all: `{ supabaseUrl, anonKey, databaseUrl, email, password }`.
- **`seed-client.ts`** — `makeSeedDb(connectionString, schema)`: a throwaway
  Drizzle client (postgres-js, SSL) for Node-side seeding/reset.
- **`config-factory.ts`** — `baseE2EConfig({ port, testDir, storageStatePath,
  webServerCommand, webServerEnv })`: a Playwright config with a setup project,
  mobile-Chromium test project, and a self-owned server that is **never reused**
  (so a stray real-AI dev server can't be picked up).

## The AI-mock pattern (server-side, at the model layer)

See `ai-mock-pattern.md`. The key decision: **do NOT intercept AI in the browser**
(`page.route`). It leaves the DB inconsistent with the UI and forces you to forge
serialized payloads. Instead, find the app's single `getModel()`-equivalent choke
point and return a deterministic mock model when a double-gated flag is on. The
whole real pipeline (validation, persistence, serialization, cache invalidation)
then runs against canned fixtures.

## Porting recipe (5 steps)

1. **Copy** `tests/e2e/harness/` into the target repo.
2. **`app/env.ts`** — load `.env.local` (`process.loadEnvFile`) and export the
   target's Supabase URL + publishable key + `DATABASE_URL`, plus test constants
   (a dedicated port, a test-user email, a sentinel household/tenant name). No
   service-role key needed.
3. **`app/auth.setup.ts`** — call `mintSupabaseSession` + `sessionToStorageState`,
   then bootstrap the app's "minimum functioning user" rows (whatever its
   `ensureOnboarded` equivalent creates). Persist ids for the seed helpers.
4. **`app/seed.ts`** — `seedState()` / `resetState()` over the app's schema, with
   the same **household/tenant-scoped safety guard** (refuse to write unless the
   resolved tenant matches the sentinel and is owned solely by the test user).
5. **AI mock** — per `ai-mock-pattern.md`, add the double-gated branch at the
   app's `getModel` seam, define fixtures, and pick a `[E2E:*]` token grammar for
   forced-failure / latency / behavior routing. Then a root `playwright.config.ts`
   calling `baseE2EConfig` with an app-unique port + the mock flag in
   `webServerEnv`.

In-repo and copyable by design — no npm package, no separate repo. Claude does the
porting; this README is the checklist.

## Gotchas learned building the meal-app suite

- **Next 16 blocks a second `next dev`** from the same directory. Use
  `next build && next start` for the E2E server (also avoids dev flakiness).
  `E2E_REUSE_BUILD=1` skips the rebuild for fast local iteration.
- **Read only the USER message** when routing the AI mock — system prompts often
  contain the very tag/keyword strings your fixtures parse ("<user_request>",
  "eating out"), which will contaminate extraction if you read the whole prompt.
- **UTC date boundaries** — seed dates with the app's own `todayISO()` (UTC) so
  seeds and UI agree; a run spanning UTC midnight can flip past/today.
- The mock stream is the AI-SDK **text-stream** protocol (progressive JSON text),
  NOT SSE.

# Spike / Plan — E2E Testing Harness

Status: NOT STARTED (teed up Session 16, 2026-07-08). Owner: Claude, on Griffin's go.

## Why (the gap)
Every session ships UI that Claude cannot click-verify — verification stops at
unit tests + typecheck + build, then Griffin runs a manual loop. Session 16 is
the clean example: a drawer click-outside interaction shipped to prod without a
single click. The `vitest` env is `node` (no jsdom/Testing Library), and even
with jsdom the risky mechanics (click-outside, scroll-to, focus order, pointer
lockup) aren't assertable — they need a real browser. This harness closes the
mechanical/regression gap so Claude self-verifies and regressions die in CI
instead of reaching Griffin.

Explicitly NOT solved by this: **taste** (is the generated plan good, do the
chips read as natural imperatives). That stays Griffin's eye; the harness can
surface screenshots to make his review faster and rarer.

## Two investments (different jobs)
1. **Playwright MCP** — Griffin enables once (`claude mcp` / plugin; ~10 min).
   Lets Claude drive a real browser live in-session (navigate/click/screenshot):
   exploratory "does it feel right," and running the manual catalog directly.
   Ephemeral (per session), not a regression net. Note: memory says Playwright
   MCP was incompatible on the work machine — expected fine on the personal Mac.
2. **In-repo E2E harness (this plan)** — the durable, compounding asset. Runs in
   the gauntlet + CI. Claude builds it end to end.

## Design (the harness)
Playwright (`@playwright/test`) + a `tests/e2e/` dir. Three pieces of shared
infrastructure, then a growing spec suite.

1. **Auth bypass** — a test-only helper that mints a Supabase session for a
   seeded test user and reuses it via Playwright `storageState`, so specs start
   logged in without the Google OAuth dance. Uses the service-role key (already
   in `.env.local`) against a dedicated test household. Gate behind a test-only
   env flag so it can never mint sessions in prod.
2. **Deterministic AI** — intercept `/api/plan/stream` (return a canned SSE
   stream of a fixed plan) and `plan.modify` (canned `changedDates` +
   `chefResponse`) via Playwright route interception, so E2E is fast, free, and
   repeatable. Mirrors the existing unit-test mock of the AI boundary
   (`vi.mock` on `modifyPlan`/`generateStream`). Keep a tiny separate "real AI"
   smoke check (opt-in, not in CI) for prompt sanity.
3. **Data seeding / reset** — reset the test household to the named states in
   `docs/test-plan.md` (EMPTY / DRAFT / MIDWEEK / ELAPSED_CONFIRMED /
   ELAPSED_DRAFT) via direct Drizzle writes or a test-only route. Run per-spec
   so cases are isolated. Handle the UTC-midnight date-shift so "past/today/
   future" boundaries are stable (watch the known `timeframeOf` off-by-one).

Add stable `data-testid`s where selectors would otherwise be brittle
(`data-meal-date` already exists and doubles as a hook).

## Scope / phasing
- **Phase 1 (this session):** stand up Playwright + auth bypass + AI-mock + seed;
  wire `npm run test:e2e`; author the FIRST specs — prioritize what shipped
  unverified: **RG1-RG5 (regenerate/Test 8), D1-D7 (drawer dismissal, esp. D3
  the lockup regression), M1-M7 (modify affordance)**. Then run them and report
  real failures (this is where Session 16's un-click-tested work finally gets
  exercised).
- **Phase 2:** backfill the rest of `docs/test-plan.md` (G/R/E/W/X). Add to CI.
- **Phase 3 (optional):** screenshot assertions for affordance states (shimmer,
  highlight, week-wrapped) so visual regressions are caught.

## Cost / payoff
- Cost: ~1 focused session for Phase 1; ~15-30 min per additional spec after.
- Payoff: Claude self-verifies UI every session instead of handing Griffin a
  manual script; regressions caught in CI; the "QA pass on wrap" rule becomes
  partly automated. First payoff is immediate — Phase 1 verifies Session 16's
  own unverified flows.
- Amortization: the same shape (auth bypass + AI mock + seed) is reusable across
  FFOS and Leila's Briefing — the identical "AI-native Next.js app I can't
  click-test" problem.

## Open decisions (resolve at build time)
- Test DB target: a dedicated Supabase test project vs. a test household in the
  existing DB (leaning: dedicated test household + hard-scoped cleanup, so no
  prod-data risk).
- Where AI interception lives: Playwright `page.route` (per-spec, explicit) vs. a
  server test-mode env returning fixtures (cleaner but adds a prod code path).
  Leaning `page.route` to keep test concerns out of app code.
- Run local-only vs. CI from day one (leaning: local Phase 1, CI Phase 2).

## Source of cases
`docs/test-plan.md` — the catalog is the 1:1 spec. Each row → one Playwright test.

## How to invoke (paste into a new session)
> Build Phase 1 of the E2E testing harness per
> `docs/plans/spike-e2e-testing-harness.md`: Playwright + auth bypass + AI-mock +
> seed, then automate the highest-risk Plan-tab cases from `docs/test-plan.md` —
> start with the drawer dismissal cases (D1-D7, especially D3 the pointer-lockup
> regression), then regenerate (RG1-RG5 / Test 8), then the modify affordance
> (M1-M7). Run them and report what actually fails.

(If enabling the Playwright MCP first: "Enable the Playwright MCP, then run the
Plan-tab manual catalog in `docs/test-plan.md` against localhost — start with the
drawer cases and Test 8.")

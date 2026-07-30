# Phase 1F Scope — Polish / Production Readiness

> **Spoke of** [scope-v1.md](scope-v1.md). **Milestone M6: MVP ship.** The last phase of Release 1.
> Opened S49 (2026-07-30), immediately after 1E.5 closed at M5.5.
>
> **Source of truth, in this order:**
> 1. `docs/design/system/design-spec.dc.html` — Design Specification v1.0. §12's migration table is the
>    backlog for the design half of this phase: items **03**, **04**, **05**, **07** are the surface-specific
>    remainder 1E.7 deliberately did not sweep.
> 2. `docs/bug-tracker.md` — the open rows are the hardening half. Nothing here is new discovery; every
>    item arrived with a repro and an address-by target.
> 3. `docs/design/visual-qa-rubric.md` — the bar each surface pass is graded against, with the gold line
>    as the documented tie-breaker.
>
> **The gold line remains the arbiter for every gold call:** *gold marks the chef speaking, not content
> you read* (Griffin, S42).

---

## Why this phase exists, and what it is not

1F is the difference between "every feature works" and "this is a product two people will run every week
for two consecutive weeks without being told how." Five phases built the loop; this one makes it hold up.

**It is explicitly NOT a redesign.** Plan's all-states design and rebuild landed in 1E.5, Groceries and
Recipes were designed in Claude Design during 1D, and onboarding in 1E. 1F polishes the system **on top
of** those surfaces. If this phase produces a new all-states design pass for any surface, something has
gone wrong with the scope.

**The phase splits into four workstreams that are genuinely independent** and can be sequenced in any
order, though the recommendation below has a reason:

| # | Workstream | One line | Gate |
|---|---|---|---|
| **A** | **Ship-blockers** | The bugs that must not reach a real first run | Each closed with a test that can fail |
| **B** | **The design-system pass** | Spec §12 items 03/04/05/07 + the two semantic calls + control consolidation | `/visual-qa` per surface, 0 blockers / 0 high |
| **C** | **PWA** | R1 installs to the home screen and launches without browser chrome | Verified on Griffin's and his wife's actual phones |
| **D** | **Production readiness** | Observability, security, performance, a11y, error states | Ship checklist |

**Recommended order: A → B → C → D**, because A contains the only item flagged *before R1 ship* on the
app's most important call (BUG-035), and because B changes pixels that C then has to be validated against
on a real device. D is last only because it grades a finished product.

---

## Griffin's calls at phase open

### ✅ RESOLVED — the closed-beta question (scope-v1 open question #1)

**Decision (Griffin, S49): no closed beta. Two-user validation is enough to ship R1.**

Parked *for* 1E, carried through 1E's close, 1E.7 and 1E.5. It gated this phase's shape and is now
answered, which is why 1F could be scoped at all.

**⚠️ Correction to the framing this decision was taken under.** The gate is **already built and already on
`main`** — PR #6, `Gate the closed beta: hide the URL, and control who may hold an account`, from the
S43 `session-43-access-gate` work. `src/lib/access.ts` ships two independent gates, `SITE_ACCESS_CODE`
(hides the app including the login screen, blocks at the proxy) and `ALLOWED_EMAILS` (decides who may hold
an account, blocks at the auth callback and again in the `(app)` layout), **both defaulting to OFF when
their env var is unset.** So "no closed beta" costs nothing to honour and removes nothing that would
otherwise have been built: the seam exists, it is off, and turning it on is an env change rather than a
code diff.

**What the decision actually settles, then:**

- **Leave both env vars unset.** Prod stays open; the gate stays dormant. Going public later is deleting
  two env vars, and running a beta later is setting them — neither is a code change.
- **No in-app feedback capture, no support path, no bug-report affordance.** This *is* real scope removed.
- **No onboarding-for-strangers pass.** The interview is tuned for two people who know what the product is
  and can say so out loud; it does not have to survive a cold user this release.
- **No multi-user load, abuse, or cost-per-user modelling** beyond what the existing rate limits give.
- **The access gate still needs one thing from this phase:** it has never been exercised in either
  direction on prod. Workstream D verifies that unset really does mean open (nobody gets locked out of the
  validation run by a gate nobody meant to arm) — a five-minute check, not a build.

**What it does NOT remove.** The Definition of Done still requires Griffin **and his wife** to each run
the full weekly ritual on prod for **2 consecutive real weeks**. Two users is the validation bar, not an
excuse to skip validation — and his wife is the closest thing R1 gets to a cold user, since she has not
been in any of these sessions. Her first run is the real test of the interview.

**Future impact.** A closed beta is not cancelled, it is **deferred to V1.5 planning**, where household
sharing arrives and the invite flow has to exist anyway. `ALLOWED_EMAILS` remains in place as the seam.

### Owed, not blocking

- **`DEV_TOOLS_EMAILS` behavioral check.** The variable is set and marked *sensitive* in Vercel, so it
  cannot be read back by anyone — the empty pulls were masking, not a failed write (decisions.md, S48).
  The only real verification is the test-mode card appearing on the You tab **of prod**, on Griffin's
  account. One glance, next time he opens prod.

---

# Workstream A — Ship-blockers

*The bar: every one of these closes with a test that could have failed. Three sessions running have found
an apparatus that was structurally incapable of catching the thing it existed to catch (BUG-030, S40's
silent prompt test, S46's prompt-blind generation fixture). A fix without a falsifiable test is not a fix.*

### A1 — BUG-035 🟡 **the 90-second generation timeout** ⭐ *first item of the phase*

**1 real generation in 9 timed out server-side**, on the single most important call in the product, and
**nobody knows what the user sees when it happens.** X1/X2 cover a *modify* failure, not a generation
timeout.

- [ ] **Question 1: what does that path render?** A named failure with a retry, or a spinner that never
      resolves? Answer by reading `src/app/api/plan/stream/route.ts` and then forcing it, not by
      inspection alone.
- [ ] **Question 2: whose timeout is it** — ours, Vercel's function ceiling, or the provider's?
- [ ] Close with an E2E spec that drives the timeout deterministically (the fixture layer can stall on
      demand; a real 90s wait does not belong in the suite).
- [ ] If the answer to Q1 is "a spinner that never resolves", that is a 🔴 and it is the first thing fixed.

**Why first:** a 1-in-9 stall on "plan my week" is the worst possible first impression, and the two-week
validation run is about to make it a real user's problem rather than a capture's.

### A2 — the onboarding save-path pair (BUG-020 🟠, BUG-021 🟠)

Both are the honest-about-saves contract reached through paths BUG-016's fix did not cover. **The
interview fires exactly once per account**, and Griffin's wife has not run hers yet — so these are fixed
*before* she does, not after.

- [ ] **BUG-020** — `retryFailed` returns `true` the moment `failedSaves` is empty, but a save still
      *in flight* is in neither bucket, so "All saved." can be shown over a save that has not landed.
      Track an in-flight count in `useCoreSaves` and await it before reporting success.
- [ ] **BUG-021** — `skipAll` routes `onSuccess` and `onError` to the same `leaveToPlan`, so a failed skip
      leaves `onboardingCompletedAt` NULL and drops the user back into the interview on next load with no
      explanation. Mirror the finish path: stay put, toast a retry.

### A3 — the household-composition cluster (BUG-011 🟠, BUG-012 🟠, BUG-010 🟠)

One root, three faces, and one of them is visible on the surface whose entire job is letting you verify
the chef is not wrong about you.

- [ ] **BUG-011** — `householdSize` has three writers that never touch `householdComposition`, so the chef
      prompt can carry `Default servings: 4` beside "Cooking for 2 adults and 1 baby". Pick one direction
      and enforce it: either the scalar writers adjust `composition.adults` and let `deriveHouseholdSize`
      run, or `householdSize` becomes read-only in the input schema. **Recommendation: read-only.** One
      writer, one derivation, and it matches how the value is already documented.
- [ ] **BUG-012** — the You tab prints "4 adults" for 2 adults + 2 children. `describeHousehold()` already
      produces the right string; `soft-constraints-card.tsx` is not calling it. Cheap, same root.
- [ ] **BUG-010** — `household_composition` ships with a column DEFAULT, so a default is indistinguishable
      from an answer. Make it nullable with no default, matching `onboarding_completed_at` in the same
      migration. **Needs a migration.**

### A4 — BUG-013 🟠 `finishOnboarding` trusts client-supplied memory text

An authenticated caller can plant 300 characters into `ai_memories` stamped `sourceType: 'onboarding'` —
the exact provenance the You ledger displays as *"You told me when we started."* Scoped to the caller's own
household and treated as untrusted user-role content downstream, so this is data integrity rather than
prompt injection. Marked **before R1 ship** in the tracker.

- [ ] Recompute `memory` server-side from `(questionId, dimension, values)` against the server's own
      question table; ignore the client's field entirely.

### A5 — the two access-gate rows that arrived with the S48 merge (BUG-042 🟠, BUG-043 🟠)

*Added after this doc was first drafted: the access-gate work merged into `main` alongside 1E.5's close
and brought two findings of its own. Neither is a code defect.*

- [ ] **BUG-042 — email became an authorization boundary, and the config it now depends on was never
      checked.** `ALLOWED_EMAILS` trusts the `email` claim to decide who may hold an account. The login UI
      offers Google only, but the Supabase Auth REST API is directly callable with the publishable key and
      GoTrue's **email provider is enabled by default**. If email signup is on *and* confirmations are off,
      someone can `POST /auth/v1/signup` claiming an allowlisted address and walk through Gate 2 without
      ever controlling that inbox. Supabase's default has confirmations ON, which is why this is 🟠.
      **Dormant while the gates stay unset** (Griffin's no-beta call), so it is not a ship-blocker for R1
      — but the fix is a **dashboard toggle**, not code, and the app only ever uses Google. Do it anyway.
- [ ] **BUG-043 — `noindex` and `robots.txt` are unconditional and will outlive the beta.**
      `public/robots.txt` (`Disallow: /`) and the `X-Robots-Tag: noindex, nofollow` header in
      `next.config.ts` are deliberately **not** env-driven: `headers()` evaluates at build time while the
      gates read env at request time, so wiring them together would let the two silently disagree. The
      accepted cost is that going public is a **code** change. **Correct to leave in place through all of
      R1** (two users, no public launch) — it graduates to the launch-day checklist below rather than
      being fixed in this phase.

### A6 — BUG-018 🟠 the harness deletes rows in the real Supabase project

`seed.ts` runs deletes over a service-role-equivalent connection against **production**, guarded only by a
household *name*. No environment check on `DATABASE_URL`, no DB-level privilege limit. S37 already saw the
harness's auth user vanish mid-run during a concurrent session.

- [ ] Add `assertNotProductionUrl()` alongside the existing name check. That is the cheap fix and it lands
      here.
- [ ] **The real answer is a separate non-prod Supabase project.** Sized and recommended in this phase; the
      call on whether to do it now or at V1.5 is Griffin's, and it is the one A-item that is not obviously
      worth doing before ship.

---

# Workstream B — The design-system pass

*Each item gets its own `/visual-qa` pass. That per-surface discipline is exactly why these were split out
of 1E.7's mechanical sweep rather than bundled into one unreviewable diff.*

### B1 — Spec §12 item **03**: retire the indigo draft pill; iOS green → `#9CB86F`

- [ ] 10 remaining `#30D158` cooked/complete checks across Recipes and Groceries.
- [ ] The indigo draft pill — the last live indigo in the product after 1E.7 retired `--primary`.

### B2 — Spec §12 item **04**: collapse the double bottom bar *(the half that remains)*

The floating-primary half **already landed in 1E.5** (pulled forward S43, because the `Add to this week`
verb needed the Recipes screen's single floating primary and the 1D toolbar occupied that exact pixel).

- [ ] **Square the nav's top corners** — the explicitly-deferred remainder.
- [ ] Confirm on a phone that S28's density complaint is actually resolved, since the fix arrived in two
      pieces a phase apart and nobody has seen them together.

### B3 — Spec §12 item **05**: 44px hit targets on every icon-only control

- [ ] Audit and fix. Overlaps Workstream D's a11y pass; do it here, verify it there.

### B4 — Spec §12 item **07**: promote faked subsection headings to real Group/Row title levels

### B5 — The two semantic calls S42 deliberately did not make

- [ ] **The amber `#FF9F0A` Groceries merge markers.** The spec has no caution hue **because amber is the
      chef**, so a merge marker in amber says the chef is speaking when the chef is not. This is a
      semantic decision, not a token swap — that is why S42 refused to sweep it. **Recommendation:** the
      merge marker becomes a neutral inset with the count as type, matching how the caught-tray chip was
      resolved under the gold line. Griffin's call.
- [ ] **The iOS-green cooked/complete checks** — same shape of question, resolved by B1's `#9CB86F` unless
      Griffin wants the check to carry no hue at all.

### B6 — The critic's four deferred findings (S48 slate)

- [ ] **The Recipes `+` weight** — it competes with the floating primary that arrived in 1E.5.
- [ ] **Picker / Recipes vocabulary unification** — the two surfaces name the same objects differently.
- [ ] **Cooked-when evidence inside pushed doors** — a pushed `Cooked before` door drops the very evidence
      its name promises.
- [ ] **Caps-label tracking** — inconsistent letter-spacing across the eyebrow labels.

### B7 — Consolidate the four freeform-input controls into the single spec §09 control

Onboarding was done in S39. **You, Groceries, and the chef sheet remain.**

### B8 — Type scale, motion, and component-library consolidation

The remaining design-system work the spec calls for beyond §12's enumerated items.

### B9 — Recipe-detail empty states (BUG-038 🟡, BUG-037 🟠)

Both were caught by Layer A in S47 and both are 1F-routed loading/empty-state work.

- [ ] **BUG-038** — labelled but empty `INGREDIENTS` and `STEPS` cards plus ~800px of void. **Omit the
      section entirely when empty, or say what is missing in one line. Never an empty labelled container.**
      Reachable in production via an un-hydrated draft or a failed URL import.
- [ ] **BUG-037** — `Add to this week` photographs as a dead grey control while `plan.current` is in
      flight. Cheapest honest fix is a named working state ("Checking your week…"); the alternative is to
      keep it enabled and await the query inside `handleClick`.

---

# Workstream C — PWA

*Decided 2026-07-24: R1 ships as an installable PWA folded into this phase; native iOS/Android stays held
pending a real capability (push/camera), validation, or a distribution trigger. Roughly one slice.*

- [ ] Web app manifest + home-screen icon set (every size iOS and Android actually ask for)
- [ ] Service worker + offline shell — **scope it honestly**: this app is useless offline except as a
      *read* of an already-generated list, which is precisely the moment it matters (standing in a store
      with bad signal). Offline read of the current grocery list is the target; offline generation is not.
- [ ] Install prompt
- [ ] Launches full-screen without browser chrome
- [ ] **Verified on Griffin's phone and his wife's**, not in a desktop emulator. This is the item most
      likely to be quietly wrong on a real device.

---

# Workstream D — Production readiness

- [ ] **Observability: PostHog** with the event taxonomy from S9, **+ Sentry.** Without this, the
      two-week validation run produces anecdotes instead of the time-to-list measurement the DoD requires.
- [ ] **Time-to-list instrumentation specifically** — the DoD says *"< 10 minutes on a real week"*, and
      that is a measurement, not a feeling. It needs an event at intent-submit and an event at
      list-ready, shipped **before** the validation weeks start or the weeks do not count.
- [ ] **Security review of the full surface** + rate-limiting audit. Per the standing rule for
      auth/secrets/PII work, live-code vulnerabilities ship as their own PR first.
- [ ] **Performance + a11y pass** (B3's hit targets verified here)
- [ ] **Error-state sweep** — every surface has a fallback with a retry, not a blank screen
- [ ] **BUG-017 🟡** — the first-run gate is not synchronous with first paint, so a brand-new account's
      page queries can race `ensureOnboarded` and throw FORBIDDEN before the redirect lands. React Query's
      default retry papers over it incidentally. **If it shows up in the wife's real first run, it becomes
      the first thing fixed** rather than a 1F hardening item.
- [ ] **Full E2E suite green across all tabs** + the ship checklist

---

## Deliberately NOT in 1F

| Item | Destination | Why |
|---|---|---|
| Closed beta, invite flow, feedback capture, support path | V1.5 | Griffin's S49 call — two-user validation is the bar |
| **BUG-023** 🟡 (`plan.modify` reports days, not slot ids) | Before multi-meal generation ships (V1.5+) | Not reachable in production: generation produces dinners only. At R1's one-dinner-per-day the client's resolution is *exactly* row-level |
| **BUG-003** 🟡 (cooked-harvest writes inside `recipe.list`) | Revisit at a scheduler, or if `recipe.list` perf degrades | Accepted for V1, documented, idempotent |
| A separate non-prod Supabase project | Griffin's call (see A5) | The cheap guard lands in 1F; the real fix may be V1.5 |
| Mid-week resync, `mergeOverrides`, bespoke Groceries empty/error states | 1D deferrals → V1.5 | Deferred by scope in 1D, unchanged |
| Any new all-states design pass | — | 1F polishes on top of the 1E.5 / 1D / 1E designs; it does not re-design a surface |

---

## Exit criteria — what closes 1F, and with it Release 1

1F is the last phase, so its exit **is** the Release 1 Definition of Done. It closes when:

- [ ] Workstreams A–D complete
- [ ] `/visual-qa` at **0 blockers / 0 high** on all five surfaces, re-captured after the design pass
- [ ] Full E2E suite green across Plan, Recipes, Groceries, You, onboarding
- [ ] **Griffin and his wife each run the full weekly ritual on prod for 2 consecutive real weeks**
- [ ] **Time-to-list measured under 10 minutes on a real week** (measured, from instrumentation)
- [ ] Production deployed and stable, **no P0/P1 known bugs**
- [ ] The two-tier QA cadence's **deep audit** fires — this is a milestone *and* money-adjacent-adjacent
      (it is the ship), so the full audit is automatic, not requested

When those land: **M6 met, R1 shipped**, and the phase-boundary protocol runs — a master-plan refresh and
a new `scope-v1.5.md`.

### Carried past 1F to launch day, deliberately

**BUG-043** — deleting `public/robots.txt` and the one `X-Robots-Tag` line in `next.config.ts`. Both call
sites carry a `LAUNCH-DAY ITEM` comment pointing back at the tracker row. It stays in place through the
whole of R1 (two users, no public launch), so it is **not** a 1F item — but it is the classic way a
launched product sits out of Google for weeks while everyone assumes SEO is just slow. It belongs on
whatever checklist governs the first genuinely public deploy, which is a V1.5-or-later artifact this
phase does not create.

---

## Change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-30 (S49) | **1F opened → 🔨.** Scope drafted from the carried-in list: BUG-035 first (the only *before R1 ship* item on the app's most important call), the standing bug list, spec §12 items 03/04/05/07, the S42 amber/green semantic calls, the S48 critic slate's four deferrals, PWA, and production readiness. Split into four independent workstreams (ship-blockers / design system / PWA / production readiness) with A→B→C→D recommended. | 1E.5 closed at M5.5 and 1F is the last phase of R1. Splitting by workstream rather than by surface keeps the per-surface `/visual-qa` discipline intact — the same argument that split 1E.7 out of 1F in the first place |
| 2026-07-30 (S49) | **A5 added after first draft: BUG-042 + BUG-043**, which arrived on `main` with the access-gate work that merged alongside 1E.5's close. Neither is a code defect — BUG-042 is a Supabase dashboard toggle (dormant while the gates stay unset, but do it anyway), BUG-043 is correct to leave in place through all of R1 and graduates to a launch-day checklist instead of being fixed here. The closed-beta section was corrected in the same pass: the gate it assumed would need building **already exists on `main`** (PR #6). | The doc was drafted against a tree that did not yet carry the access gate. Scoping a phase against a stale picture of `main` is how an item gets built twice or missed entirely |
| 2026-07-30 (S49) | **scope-v1 open question #1 RESOLVED: no closed beta.** Two-user validation (Griffin + wife, 2 consecutive real weeks) is enough to ship R1. Removes the invite gate, feedback capture, support path, and onboarding-for-strangers pass from this phase. `ALLOWED_EMAILS` stays fail-open as the V1.5 seam. | Parked *for* 1E and carried through three phase closes; it gated 1F's shape and could not be deferred again without opening the phase blind. The wife's first run is the nearest thing R1 has to a cold user, and it is already in the DoD |

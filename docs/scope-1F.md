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
| **A** ✅ | **Ship-blockers** | The bugs that must not reach a real first run | Each closed with a test that can fail — **6 of 6 done, S50 + S51** |
| **B** | **The design-system pass** | Spec §12 items 03/04/05/07 + the two semantic calls + control consolidation | `/visual-qa` per surface, 0 blockers / 0 high |
| **C** | **PWA** | R1 installs to the home screen and launches without browser chrome | Verified on Griffin's and his wife's actual phones |
| **D** | **Production readiness** | Observability, security, performance, a11y, error states | Ship checklist |

**Order: A → B → C → D**, then the two validation weeks. A contained the only item flagged *before R1 ship*
on the app's most important call (BUG-035); B changes pixels that C then has to be validated against on a
real device.

**⚠️ D is NOT last because it "grades a finished product" — that framing was wrong and was corrected in S52.**
Claude proposed pulling D's instrumentation forward to start the two-week clock sooner; Griffin overruled
it, and the order is now load-bearing for two reasons rather than one:

- **Validate the artifact you ship.** The PWA (C) is how Griffin actually intends to use the product, so
  validating in a browser tab spends the two expensive, uncompressible weeks on a configuration that is not
  what ships.
- **D is the debugging substrate for the validation weeks themselves**, not merely the source of the
  time-to-list number. Without it Griffin describes a bug from memory and Claude guesses. This is *why* D
  still precedes validation — which is what Claude's reorder was actually chasing, and which B → C → D
  already delivered.

Full reasoning in `decisions.md` (2026-07-31).

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
- **⚠️ CORRECTED S60. This line originally read "no in-app feedback capture, no support path, no
  bug-report affordance — this *is* real scope removed."** The support path and the
  bug-report-affordance-for-strangers stay out. **In-app feedback capture is back IN, as Workstream E**
  (Griffin, S60: *"I didn't mean to cut the in-app feedback"*).
  **The cut was a bundling error, not a judgement call.** Every other item on this list is justified by
  *there are no strangers in R1*. Feedback capture is not: **its primary user is Griffin, on his couch,
  with a phone and no laptop.** That justification survives "no closed beta" completely intact, and it got
  swept up only because it arrived in the same sentence as the support path. **The two validation weeks
  are the densest couch-testing window this project will ever have** — shipping the capture tool after
  them spends the window it exists for.
- **No onboarding-for-strangers pass.** The interview is tuned for two people who know what the product is
  and can say so out loud; it does not have to survive a cold user this release.
- **No multi-user load, abuse, or cost-per-user modelling** beyond what the existing rate limits give.
- **The access gate still needs one thing from this phase:** it has never been exercised in either
  direction on prod. Workstream D verifies that unset really does mean open (nobody gets locked out of the
  validation run by a gate nobody meant to arm) — a five-minute check, not a build.

**What it does NOT remove.** The Definition of Done still requires Griffin **and his wife** to each run
the full weekly ritual on prod for **2 consecutive real weeks**. Two users is the validation bar, not an
excuse to skip validation.

> **⚠️ FACTUAL CORRECTION, S60.** This paragraph used to end: *"his wife is the closest thing R1 gets to a
> cold user, since she has not been in any of these sessions. Her first run is the real test of the
> interview."* **Both halves are false.** Griffin, S60: she is a **software engineer**, she has **sat
> beside him for much of this build**, and she will be **testing as aggressively as he does.** She is a
> **second tester with context**, not a proxy for a stranger — R1 has **no** cold user and should stop
> claiming one.
> **Why this matters beyond the fact:** the false premise was written once in S49 and then repeated in
> `scope-v1.md` and `decisions.md`, and by S60 it was load-bearing — it was the entire basis for a
> recommendation to withhold `DEV_TOOLS_EMAILS` from her, stage her account creation as an observed event,
> and weight her feedback below Griffin's. **All three fell the moment the premise was checked.** Same
> failure mode as the feedback-capture bundling error two entries down, in a different costume: *a claim
> nobody re-examined, repeated across three docs until it read as established.*

**Future impact.** A closed beta is not cancelled, it is **deferred to V1.5 planning**, where household
sharing arrives and the invite flow has to exist anyway. `ALLOWED_EMAILS` remains in place as the seam.

### Owed, not blocking

- **✅ `DEV_TOOLS_EMAILS` — CLOSED (S50).** Griffin verified the test-mode card is live on prod for his
  account. The variable is set and marked *sensitive* in Vercel, so it can never be read back — the empty
  pulls were masking, not a failed write (decisions.md, S48), and the behavioral check was the only
  possible verification. Carried for nine sessions; done.

---

# Workstream A — Ship-blockers ✅ **CLOSED S51 (6 of 6)**

*The bar: every one of these closes with a test that could have failed. Three sessions running had found an
apparatus that was structurally incapable of catching the thing it existed to catch (BUG-030, S40's silent
prompt test, S46's prompt-blind generation fixture). A fix without a falsifiable test is not a fix.*

**A fourth instance landed in S51, inside this very workstream** — BUG-013's values assertion could not fail
because the branch it targeted lowercases its output, so an uppercase marker never matched a string that had
in fact been planted. The bar caught it. That is the bar working, not the bar failing.

**What the six items taught, across S50 and S51.** In S50 the tracker was wrong about what three of the bugs
WERE, and twice the real defect was worse than the filed one. In S51 the tracker was right about the bug and
wrong about the FIX, twice: BUG-013's recommended recompute would have made the injection more than twice as
large, and BUG-018's named `assertNotProductionUrl()` would have failed **open** on every unrecognised
project. **A parked bug's recommendation is a hypothesis from the moment it was filed, not a spec.**

### A1 — BUG-035 ✅ **CLOSED S50** — *was filed as a 90-second timeout; both open questions were answered wrong in the tracker*

**1 real generation in 9 timed out server-side**, on the single most important call in the product, and
**nobody knows what the user sees when it happens.** X1/X2 cover a *modify* failure, not a generation
timeout.

- [x] **Q1 — what does that path render?** **Nothing.** Not a spinner that never resolves; the screen
      simply returns to normal as though you never asked. `useObject` only sets `error` for a failed
      REQUEST, and the route has already returned 200 with an open body by the time a stall happens, so a
      dead stream arrives as a body that just CLOSES. The failure card existed but was **unreachable on
      every path** since it was written — not only the `!plan` one. First run dropped you on the intent
      screen with your typed request erased; regenerate silently reappeared the old plan. **🔴, not the
      🟡 it was filed as**, and the more likely path in real use.
- [x] **Q2 — whose timeout?** **Ours.** There is no 90s timeout anywhere in the app: the only `90_000` in
      the repo is the Playwright `waitFor` ceiling in `plan-live.capture.ts`. S45 recorded the harness's
      own wall as the server's. The real abort was `AbortSignal.timeout(60_000)`.
- [x] **A second bug underneath it:** `maxDuration` (60) EQUALLED the AI abort (60), so on Vercel the
      platform's kill and our timeout land at the same instant and the route never gets to render its own
      failure. Hobby allows 300s with fluid compute, so the 60 was self-imposed.
- [x] **X3–X6 shipped. X3 and X4 both failed before the fix.** X6 drives the REAL timeout in 2.5s via an
      E2E-only per-attempt override production cannot honour, rather than letting an error part stand in
      for a timeout.

**Why first:** a 1-in-9 stall on "plan my week" is the worst possible first impression, and the two-week
validation run is about to make it a real user's problem rather than a capture's.

### A2 — the onboarding save-path pair ✅ **CLOSED S50** (BUG-020, BUG-021)

Both are the honest-about-saves contract reached through paths BUG-016's fix did not cover. **The
interview fires exactly once per account**, and Griffin's wife has not run hers yet — so these are fixed
*before* she does, not after.

- [x] **BUG-020** — every settled save promise is tracked in an `inFlight` set and `retryFailed` AWAITS
      those before asking whether anything failed. A second part was needed to make it work: a state
      update from an awaited callback is **not visible to the closure that awaited it**, so the failures
      list is mirrored into a ref written synchronously. Without that the fix would await correctly and
      then read a stale empty array. **OB16** (blip → the answer lands) + **OB18** (gone → stays put).
- [x] **BUG-021** — mirrors the finish path: stay put, toast a retry. **OB17**.
- [x] All three verified failing against the pre-fix code. OB16/OB18 hold the in-flight window open with a
      gate the TEST releases rather than a timer, because a spec that only reproduced this interleaving on
      a slow machine would be worse than none.

### A3 — the household-composition cluster ✅ **CLOSED S50** (BUG-011, BUG-012, BUG-010)

One root, three faces, and one of them is visible on the surface whose entire job is letting you verify
the chef is not wrong about you.

**⚠️ This doc's own recommendation had a hole, and Griffin chose the real fix over the cheap one.**
"Make `householdSize` read-only" is right in principle, but BOTH non-onboarding writers send a **bare
count** — the You-tab stepper and the `set_household` talk op — and a count cannot say which band changed
(2 adults + 2 children stepped 4→5 is either a third adult or a third child). Read-only alone would have
broken them. Offered a cheaper read-time patch (derive from composition in `getChefContext`, leave the
writers alone); Griffin declined it — *"I don't see why we wouldn't just make the real fix right now"* —
and declined a design pass on the new control. Both calls held up: the sheet already WAS a stepper sheet,
so three steppers is an in-pattern change rather than the new surface this phase forbids.

- [x] **BUG-011** — three parts. **(1)** `HouseholdComposer` extracted from the onboarding screen into
      `components/shared/` and used by the You-tab sheet, so two surfaces edit one fact through one
      control; `normalizeComposition` moved to `lib/household.ts` because the server applies it too.
      **(2)** `set_household` is band-aware — bands when the message names them, and bands it was not told
      about are preserved ("we've got a baby now" no longer erases the children). A bare total falls back
      to **landing on adults**: a stated guess rather than drift, since an unspecified extra person is an
      adult and adults are the only band that always counts toward servings. **(3)** `householdSize` is
      READ-ONLY in `updatePreferences`. **Y4/Y11** (UI writer), **Y12/Y13** (talk writer), 9 unit tests.
- [x] **BUG-012** — new `householdRoster()`; `describeHousehold` suppresses the adults-only case because
      the chef PROMPT has a companion line and a UI label does not. With no composition on file the count
      is named as what it IS ("2 servings") rather than dressed as a roster. The E2E seed became a MIXED
      household (2 adults + 1 child) — the exact shape that rendered "3 adults" — so Y1 fails on regress.
- [x] **BUG-010** — migration `0010` drops the default. **Existing rows deliberately NOT backfilled to
      NULL**: a genuine "2 adults, no kids" answer is byte-identical to the default, so nulling them would
      destroy real answers to fix a cosmetic inconsistency. `updatePreferences` accepts an explicit null so
      an UNDO can restore never-answered, and nulls `householdSize` alongside it.

### A4 — BUG-013 ✅ **CLOSED S51** — *the recommended fix, applied literally, would have doubled the payload*

An authenticated caller could plant 300 characters into `ai_memories` stamped `sourceType: 'onboarding'` —
the exact provenance the You ledger displays as *"You told me when we started."* Scoped to the caller's own
household and treated as untrusted user-role content downstream, so data integrity rather than prompt
injection. Marked **before R1 ship** in the tracker.

- [x] **This doc's recommendation had the same shape of hole A3's did.** "Recompute from
      `(questionId, dimension, values)`" lands in `memoryForAnswer`, whose label lookup fell back to the
      **raw value** (`?? v`). Recomputing alone would have echoed **12 values × 60 chars** of caller text
      into the sentence — more than double the 300-char cap the filed bug had. Confirmed rather than
      reasoned: the naive version was built first and the values test went red against it.
- [x] **Three parts.** `deepAnswerSchema` drops `memory` **and** `dimension` (zod strips unknown keys, so
      the client posts what it holds and neither field reaches the server — stronger than ignoring them,
      because nothing is left to start trusting again). `memoryForAnswer` filters `values` to the options
      the question actually offers, de-duplicated, so the sentence is built entirely from the server's own
      labels; the category is read off `question.dimension`, so a caller cannot file a preference as a
      behavior. And `synthesizeHeadlineMemory`'s `DIET_LABEL[x] ?? x` — the same echo through a quieter
      door — now **drops** a framework it has no label for.
- [x] **The `as InterviewState` cast is gone.** That cast is what let a schema field typed `string` stand
      in for one typed as an enum unnoticed; `synthesizeMemories` now takes a `MemorySource` naming exactly
      what it reads.
- [x] **6 tests, each verified failing against the code it targets** — 4 against pre-fix, the values one
      against the naive fix, the diet one against the old `?? x` line. ⚠️ One of them **initially could not
      fail**: the proteins branch lowercases its list, so an uppercase marker never matched a string that
      had in fact landed. Fourth instance in five sessions of *the apparatus has to be able to fail*.
- [x] **New: BUG-044 🟡** — `interviewStateSchema` types `dietaryFramework` as a bounded string where the
      persist path enforces an 8-value enum. No longer an injection path, but the two boundaries disagreeing
      about one domain is how the echo got there. Routed to **Workstream D**'s security review, because
      narrowing it means moving the framework list into a shared pure module (four files) and that is not a
      ship-blocker's scope.

### A5 — the two access-gate rows that arrived with the S48 merge ✅ **RESOLVED S51** (BUG-042 🟠, BUG-043 🟠)

*Added after this doc was first drafted: the access-gate work merged into `main` alongside 1E.5's close
and brought two findings of its own. Neither is a code defect.*

- [x] **BUG-042 — measured S51, and it is NOT exploitable today.** The assumption the row was filed on has
      now been checked instead of assumed: `GET /auth/v1/settings` on the live project returns
      `external.email: true` — the provider **is** on — with **`mailer_autoconfirm: false`**, so
      confirmations are required. The bypass needs both halves and has one. A signup claiming an
      allowlisted address gets no session until the real inbox owner confirms it.
- [ ] **Still Griffin's toggle, as hygiene rather than a fix.** Authentication → Sign In / Providers →
      disable **Email**. The app has never used that path, and an auth path nothing uses is surface area
      whose safety rests on a dashboard setting nobody re-reads.
- ⚠️ **Worth saying plainly, and it is not what BUG-042 is about:** the same probe returns
      `disable_signup: false` with `google: true`, and both access-gate env vars are unset per the S49
      no-beta call. **Prod is open to anyone who finds the URL, through Google.** That is the deliberate
      state, `robots.txt`/`noindex` are what keep the URL unfound, and this toggle does not change it.
- [x] **BUG-043 — confirmed correct as-is, S51; graduates rather than gets fixed.** Both call sites verified
      to carry their `LAUNCH-DAY ITEM` comment pointing back at the tracker row.
      **`noindex` and `robots.txt` are unconditional and will outlive the beta.**
      `public/robots.txt` (`Disallow: /`) and the `X-Robots-Tag: noindex, nofollow` header in
      `next.config.ts` are deliberately **not** env-driven: `headers()` evaluates at build time while the
      gates read env at request time, so wiring them together would let the two silently disagree. The
      accepted cost is that going public is a **code** change. **Correct to leave in place through all of
      R1** (two users, no public launch) — it graduates to the launch-day checklist below rather than
      being fixed in this phase.

### A6 — BUG-018 ✅ **CLOSED S51** (the guard) · the separate project is Griffin's open call

`seed.ts` ran deletes over a service-role-equivalent connection against **production**, guarded only by a
household *name*. No environment check on `DATABASE_URL`, no DB-level privilege limit. S37 already saw the
harness's auth user vanish mid-run during a concurrent session.

- [x] **Built as an allow-list, not the `assertNotProductionUrl()` this doc named.** No property of a URL
      says "production", so inverting the question would make the guard fail **open** on every project it
      did not recognise. `tests/e2e/app/project-guard.ts` parses the project ref out of **both**
      `NEXT_PUBLIC_SUPABASE_URL` and `DATABASE_URL`, requires the two to agree, and requires the result to be
      in a committed allow-list. The two-URL agreement check earns its place on its own: a half-edited
      `.env.local` would otherwise have the app talking to one project while the seeder deleted rows in
      another.
- [x] **The ref is committed rather than configured.** The failure mode this bug names *is* a misconfigured
      `.env.local`, and a guard living in that same file cannot catch it. The ref is not a secret — it is the
      host in `NEXT_PUBLIC_SUPABASE_URL`, which ships to every browser that loads the app.
- [x] **Wired at module load** in `tests/e2e/app/env.ts`, so it fires before Playwright builds a project
      list. Verified by pointing the suite at a foreign ref: it refuses at config load, no server started, no
      connection opened. 10 unit tests.
- [x] Two config lines came with it — vitest's blanket `tests/e2e/**` exclusion narrowed to the Playwright
      *file patterns*, and the harness config's `testMatch` pinned to `.spec.ts`. A pure harness helper was
      previously unreachable from **either** runner, so it could not have carried a test at all.
- [ ] **The separate non-prod Supabase project is Griffin's call, and it is now a decision rather than a
      defect** → `open-questions.md`. **Recommendation: V1.5, not now.** Reasons in that entry; the short
      version is that a second free-tier project pauses on inactivity, and an E2E suite that goes red for
      infrastructure reasons trains you to ignore red — which is the exact failure BUG-019 cost three
      sessions to unlearn.

---

# Workstream B — The design-system pass

*Each item gets its own `/visual-qa` pass. That per-surface discipline is exactly why these were split out
of 1E.7's mechanical sweep rather than bundled into one unreviewable diff.*

### B1 — Spec §12 item **03**: retire the indigo draft pill; iOS green → `#9CB86F` ✅ **CLOSED S52** — `/visual-qa` 0 blockers / 0 high

- [x] **The 9 `#30D158` literals across 4 sites** (`recipe-card`, `cooked-strip`, and the Groceries header's
      banner + check) now run on a new `.spec-success-soft` utility carrying the spec's own stated pair
      (`rgba(156,184,111,.14)` fill, `rgba(156,184,111,.3)` line) plus `text-[var(--spec-success)]` for the
      glyph. Fill and line are separated from the hue on purpose: the completion banner's *sentence* stays
      `foreground`, because law 03 says nothing you read twice is accent-coloured.
- [x] **⚠️ The indigo draft pill did not exist, and this doc had the reason backwards.** It said the pill was
      *"the last live indigo in the product after 1E.7 retired `--primary`"* — but retiring `--primary` is
      exactly what killed it. `recipe-card.tsx` renders the pill with `bg-primary/12 text-primary/90
      border-primary/25`, and 1E.7 aliased `--primary` → `--spec-action`. **There are zero indigo literals
      left in `src/`.** Third session running where the parked recommendation was the thing to distrust.
- [x] **The real finding underneath it, which is not what was filed.** With indigo gone the pill had become
      **cream** — the *action* hue. §01 says cream is what you press, so the pill was styling a status label
      in the one colour that means "tap me", at the same weight as a primary button's own text. The spec's
      ask was a *"provisional neutral chip"*, and cream is not neutral in this system. Shipped as the same
      neutral inset B5 gives the merge marker, which is also why the two land in one pass.
- [x] **`src/components/palette.test.ts` — a source-scraping guard, verified failing against the pre-fix
      code** (it named all 4 green sites and both amber merge-marker lines). A retired hex fails nothing on
      its own: it renders, it looks deliberate, and it survives every DOM assertion — the `.glass-card` blur
      class of bug. The amber case is an **allow-list**, not a block-list, because "is this hex a merge
      marker or something else" cannot be answered from the string. ⚠️ It initially failed all three cases
      **against itself** — the file names every literal it forbids — so the walk now skips it.

### B2 — Spec §12 item **04**: collapse the double bottom bar ✅ **CLOSED S54** *(the half that remained)*

The floating-primary half **already landed in 1E.5** (pulled forward S43, because the `Add to this week`
verb needed the Recipes screen's single floating primary and the 1D toolbar occupied that exact pixel).

- [x] **Square the nav's top corners.** `rounded-t-[18px]` deleted from `tab-bar.tsx`. The spec's §07 Fix 1
      argument is that a full-bleed bar pinned to the device bottom **is** system chrome, and rounding its
      top makes it read as a sheet that got stuck halfway up. `.spec-chrome` already carried the hairline
      `border-top` the spec names as what should do the separating, so this was a deletion, not a swap.
      *(The spec says the bar carries 22px; 1E.7 had already regularised it to 18px. Rounded either way —
      the defect was real and in the form described, just at a different number.)*
- [x] **New spec `SH1`**, in a new `tests/e2e/specs/shell.spec.ts`. Asserts computed
      `border-top-left/right-radius === 0px` — measured, never a class-name match (RC11's precedent). ⚠️ **It
      asserts in BOTH directions**: it also requires the hairline `border-top` to survive, because a build
      that squared the corners by dropping `.spec-chrome` entirely would satisfy the radius half while
      deleting the thing meant to replace it. **Verified failing first** — the code was still pre-fix when
      the spec was written, so its first run *was* the force-failure: `Received: "18px"`.
- [ ] ⚠️ **STILL GRIFFIN'S, and it is a phone check, not a capture.** Confirm S28's density complaint is
      actually resolved. The fix arrived in two pieces a phase apart (the floating toolbar deleted in 1E.5,
      the corners now) and **nobody has seen them together on a device.**

### B3 — Spec §12 item **05**: 44px hit targets on every icon-only control ✅ **CLOSED S54** — *the sweep was blind to four of the six sites*

- [x] **`SH2` is the audit and the assertion in one.** It walks the rendered tree for controls whose whole
      visible content is a glyph (`innerText` empty + an `<svg>` inside) and measures the real box, so
      "icon-only" is derived from the DOM rather than from a class-name list somebody has to remember to
      update. It also asserts the sweep found *something*, because a broken selector would otherwise read as
      a clean app.
- [x] **Found by the sweep:** the Plan tab's `Settings` link at **32×32**, and the recipe-card favourite
      heart at **36×36** (×5 cards). ⚠️ The spec describes the heart as *"a bare 19px SVG with no padded
      target"* — it is 36px, already padded partway, presumably by 1E.7's radius sweep. **The defect was
      real but not in the filed form**, the phase's lesson at its mildest.
- [x] ⚠️ **Found only by the SOURCE-side cross-check, and this is the finding.** Four more sites live inside
      a dialog or a sheet the tab sweep never opens: three `icon-sm` buttons in the recipe detail and the
      shared dialog close, all **28×28**. Worse, they are not per-site defects at all — `ui/button.tsx`'s
      icon variants are **24 / 28 / 32 / 36px**, i.e. *every rung of the shared primitive is below the
      floor*, so the next `size="icon"` anyone writes is wrong by default. **Asking what the sweep could not
      see is what turned six call sites into one root cause.**
- [x] **Fixed at the primitive:** all four `icon*` variants carry `min-w-11 min-h-11`. A `min-*` rather than
      a new size, so the declared rung still states the painted intent — and since every consumer is
      `variant="ghost"`, which paints nothing at rest, the floor buys tap area and changes nothing on
      screen. The heart (`size-9` → `size-11`) and `Settings` (`p-1.5` → `size-11`) are bare glyphs with no
      fill, so they are invisible too.
- [x] **The two that DO paint, stated rather than buried:** the cream send circle in the Plan composer and
      the chef sheet went **36 → 44px**. That is a visible change. It is not a redesign — spec §11 bands
      icon buttons at **40–46px**, so 36 was off-system in two ways at once — but it is the one part of B3
      Griffin will see. Both composers' `pr-12` → `pr-14`, or the text would run under the enlarged circle.
- [x] **`SH2` extended to open the recipe detail**, so the layer that missed those three can see them now.
- [x] ⚠️ **AMENDED S56 — this item shipped with 17 real violations behind a SECOND blind spot in the same
      sweep.** `SH2`'s Groceries and You legs waited on `nav`, the tab bar, which renders instantly on every
      route; its Plan and Recipes legs waited on real content. Both those tabs render a loading body until
      their tRPC query lands, so **the sweep was measuring a skeleton on two of its five legs** and reporting
      a clean app. With the waits fixed it found **17 undersized controls across 3 components**, none
      reachable from B3's `ui/button.tsx` fix because all three are raw `<button>`s: the Groceries aisle drag
      handle at **15×15** (the spec's own example of a real tap failure, grabbed standing in a shop), the You
      memory-card actions at **28×28**, and the constraint chip's remove `×` at **20×20**.
      **Two fixed in S56, on Griffin's call.** The drag handle takes a 44px box centred on the glyph with an
      equal negative margin, so the target is real and the aisle header keeps its height — growing the row
      would have added ~28px to every aisle on the list you scroll most, and the glyph paints nothing, so
      there is nothing to see. The memory-card buttons went 28 → 44 and **do** paint, the same trade B3
      stated for the send circle.
      **One deliberately not fixed → BUG-048**, because the chip is 36px tall and a 44px target inside it is
      a chip redesign rather than a sweep's decision. ⚠️ **Its exemption lives at the call site** as
      `data-hit-target-exempt="BUG-048"`, and `SH2` fails if an exempt control is **not** undersized — so
      closing the bug reds the suite until the attribute goes with it (S52: a fixed bug cannot leave a stale
      permission behind).
      **This is the sixth instance of *ask what the layer cannot see*, and the second inside this one sweep.**
      S54's version was "writing the instrument does not exempt it from the question." S56 adds the clause:
      **neither does fixing it once.**

### B4 — Spec §12 item **07**: promote faked subsection headings to real Group/Row title levels ✅ **CLOSED S54** — *the item was smaller than filed, and its other half was free*

**Griffin's call at the top: do both halves** — the type adoption *and* the element promotion.

- [x] **The two levels did not exist.** `.spec-group-title` (19px/650/1.28/-.2px) and `.spec-row-title`
      (15.5px/600/1.25) added to `globals.css`. The spec added these two rungs precisely because *"the build
      had a 32px screen title and an 11px section label and nothing between them,"* so subsections were
      built out of body text at random weights. Naming them is the fix for that scatter.
- [x] ⚠️ **The type half is TWO sites, not a sweep — measured, not assumed.** Searching for the pattern the
      spec actually describes (a label paired with a 12.5px meta line) returns exactly one genuine fake:
      `household-composer.tsx`'s band label at 16px, off the ladder in both directions. `plan-review.tsx`'s
      grocery row was already at 15.5/600/1.25 by hand and simply adopts the utility. **The ~13 uppercase
      labels that *look* faked are not** — 11px Section label is a real, existing level in the spec's ladder
      doing its real job, and item 07's words are "a 15px semibold paragraph."
- [x] **The element half — 9 sites, `<p>` → `<h2>`, exact classes preserved, zero pixels moved.** The spec
      names the levels **"Group title · H4"** and **"Row title · H5"**, so the element is half the ask, and a
      subsection headed by a paragraph is the faked heading in its purest form. The app had **no `<h4>` or
      `<h5>` anywhere** and no document outline below `<h2>`. Doing it here means Workstream D's a11y pass
      **verifies** rather than builds.
- [x] ⚠️ **Two candidates deliberately NOT promoted, and getting this wrong would have been worse than doing
      nothing.** Groceries' `Groceries · This week` and You's `Your chef` sit directly above an `<h1>` —
      they are **kickers in a title block**, and promoting them would put an `h2` *before* the `h1`. Two more
      (`got-it-zone`, `plan-drafts-shelf`) are labels **inside a `<button>`**, where the text is already the
      control's accessible name and `plan-drafts-shelf` additionally carries `<section aria-label>`. **A sweep
      of "every uppercase label" would have broken all four.**
- [x] **New spec `SH3`**, asserting by **role**, not by text — `getByText` passed happily against the
      paragraphs these used to be, so only the role can fail on a regression. **Verified failing against
      pre-fix markup** via a physical file backup + `git checkout` revert and a full rebuild: red at
      `heading("Produce")` → *element(s) not found*, the predicted cause exactly.
- [x] ⚠️ **A stale-build near-miss worth recording.** The first re-run after the B3 fixes used
      `E2E_REUSE_BUILD=1` and reported the *old* numbers — a false red that looked exactly like a failed fix.
      **S52's lesson through a new door: the run has to be against the code you think it is.**

### B5 — The two semantic calls S42 deliberately did not make ✅ **CLOSED S52** — `/visual-qa` 0 blockers / 0 high

**Griffin took both recommendations** (S52, *"i'm good with your recos"*).

- [x] **The amber `#FF9F0A` Groceries merge markers → a neutral inset carrying the count as type.** Amber is
      the chef; a merge is a mechanical fact about the list, so amber said the chef was speaking when the
      chef was not. **The marker was two things, not one** — an amber dot beside the item name *and* the meta
      line beneath it rendered in amber. Both are gone; the meta line, which already read `2 dinners`, IS the
      marker now, rendered as the caught-tray chip's neutral inset (`rgba(240,222,190,.07)` fill, `.14`
      line, muted type). The count is strictly more information than the dot carried: a dot said *something
      happened here*, `2 dinners` names what the chevron is about to show. Layout is unchanged at 390px,
      because the string was already occupying that row.
- [x] **The cooked/complete check keeps a hue: `#9CB86F`.** Griffin's call. The gold line governs *gold* and
      says nothing about a success hue, `#9CB86F` is the spec's own, and a check is the thing you scan for on
      two surfaces — going hueless would sink it to the weight of everything around it. Resolved by B1.
- [x] **`GR-L1` now asserts the marker's TEXT rather than its presence.** The old assertion
      (`grocery-merge-dot` `toBeVisible`) passed whenever `sources.length > 1` was truthy at all, so it could
      not fail on a wrong count. It reads `toHaveText("2 dinners")`.
- [ ] ⚠️ **NEW: BUG-045 🟡, deliberately not swept.** The quick-add dedupe notice
      (`grocery-list.tsx:143`) is the same amber miscast one affordance over, and is now the last `#FF9F0A`
      in the product. Griffin's call named the **merge markers**; adjacent-code improvement is not the ask,
      so it is a tracked row with a repro rather than a silent extra diff. The palette guard allow-lists that
      exact line, so **closing BUG-045 turns the test red until the exception is deleted too** — a fixed bug
      cannot leave a stale permission behind.
- [x] **A capture-coverage hole found while closing this, and closed with it.** `grocery-complete-banner`
      had **no capture state and no spec assertion anywhere** — it was referenced only by the component that
      renders it. So B1 repainted a surface the visual gate was structurally unable to see. New
      `grocery-complete` capture state. Same class as S47's "Layer A had never captured a sheet state": found
      only by asking what the layer *cannot* see, never by reading what it does.
- [x] **The rubric's own do-not-flag list was about to excuse both fixes.** `visual-qa-rubric.md` §(b) told
      the judge to ignore `#30D158` and amber merge markers as deliberately un-migrated. Left alone it would
      have graded the *new* palette against the *old* exemption — S42's exact finding about this same file,
      one section down. Both entries flipped to reportable; `PROJECT-CONTEXT.md` and the stale
      `mergeDotOnMultiSourceItem` capture fact updated with them.
- [x] **⚠️ The `/visual-qa` pass caught a law-05 break in the first version of the fix, and it is the reason
      the gate exists.** The merge marker shipped as an **inert** chip with fill + border, with the
      disclosure chevron still sitting beside it. Law 05: *fill + border ⇒ it must respond to a tap; if it
      only names something, it is flat type with no container.* An inert pill next to the control that
      actually opens the thing is exactly what that law forbids — and it is invisible to every DOM
      assertion, because the markup was correct and only the *meaning* was wrong. **Fixed by folding them
      together:** the marker IS the disclosure now (`2 dinners ⌄`), the standalone chevron is deleted. That
      satisfies law 05, removes a control, enlarges the hit target, and puts the affordance on the words
      that describe it.
- [x] **The cooked badge is deliberately NOT given the same treatment**, though it is also a non-tappable
      fill+border chip. The spec's §07 gallery draws exactly that component — `#9CB86F` with the soft fill
      and line, labelled *"Cooked twice"* — so it is spec-canonical, and the spec beats a generic reading of
      its own law. The merge marker had no such precedent, which is why law 05 governed there. Recorded so
      the asymmetry is a decision rather than an inconsistency.
- [x] **Gate: 0 blockers / 0 high on both surfaces**, all 13 states `captureStatus: ok`. Critique in
      `tests/e2e/captures/A-groceries-2026-07-31T12-20-44-855Z/critique.md`. **27 targeted E2E green**
      (Groceries 13 + Recipes 13 + setup) after the law-05 change.
- ⚠️ **Carried out, not a B1/B5 finding:** `CAPTURE_ISSUE you-field-editor` — one You-tab capture state
      failed its pre-shot check. Not on either surface this pass gates, and the You freeform control is
      **B7**'s scope. Flagged rather than folded in, since the rubric treats a non-`ok` captureStatus as a
      signal on its own.

### B6 — The critic's four deferred findings (S48 slate) ✅ **CLOSED S55** — *three built, one measured and moved*

Each of the four was verified against source before anything was touched, per the phase's standing rule that
a parked finding is a hypothesis from the day it was filed. **Two of the four were not the size they were
filed at**, in opposite directions.

- [x] **The Recipes `+` weight** — real, and the finding named one object where the spec states a rule.
      `recipe-header.tsx` drew a filled cream 44px square, so manual recipe entry outranked the tab's actual
      job. Routed to the existing **`.spec-control-cream`**, which already *is* the spec's `action.soft` rung
      (`.1` fill / `.32` line, cream label) — a route to a class rather than a new treatment.
      ⚠️ **THE HALF THE CRITIC COULD NOT SEE, and it is why softening the `+` alone would have been
      cosmetic.** §08 reads *"One filled cream button per viewport. If two actions both feel primary, one of
      them is not."* The Recipes library had **two**: the `+` and the **selected filter chip**, which was
      `bg-primary text-primary-foreground border-primary` — a fully filled cream button standing in for a
      filter state. Softening only the `+` would have handed the primary rung to a filter. The spec draws a
      chip as cream-**tinted**, never filled (`on: .14 fill / .36 line / 600 · off: .05 / .12 / 500`, at
      36px · 13.5px · r12, 9px gap), with selection on the action cream and rest on the neutral cream. Both
      are now right. ⚠️ **Stated precisely, because the capture makes it visible:** the Recipes **library**
      viewport now carries **zero** filled cream buttons, and the **detail** viewport carries exactly one
      (`Add to this week`). Law 06's *"exactly one filled cream button"* is read here as a **ceiling, not a
      floor** — a browse screen whose primary action lives on the next screen should not manufacture one, and
      manufacturing one is precisely the defect the critic filed. The hierarchy now reads: browse is quiet,
      the screen where the decision happens carries the weight.
      ⚠️ **The rubric already carried the rule that would have caught it.** `visual-qa-rubric.md` law 06 has
      said *"exactly one filled cream button"* per viewport since S42, and `/visual-qa` passed this surface at
      0 blockers / 0 high in S52, S53 and S54 with two of them on screen. **A rule the judge holds is not the
      same as a rule the judge applies.**
- [x] **Picker / Recipes vocabulary unification** — real, and smaller than it reads. Only two concepts are
      genuinely shared: `All` ≡ `Everything` and `Cooked` ≡ `Cooked before`. `Recently saved`, `Imported` and
      `Under N min` have no Recipes counterpart, so this is a two-word rename rather than a merge.
      **Griffin's call (S55): Recipes' words win** — its chips are a width-constrained non-wrapping row where
      the longer pair risks a wrap at 360px, and a door labelled `Cooked` with its count beneath loses
      nothing. The tiles-vs-chips split is untouched: §A's rule is about the **control**, and only the copy
      was ever duplicated.
      ⚠️ **Neither surface's words were pinned by any test.** The picker unit test hand-fed its label into
      `tileHeading`, so it could never fail on a rename; the Recipes specs addressed every chip by `testid`
      and asserted only counts. Both sides now assert the copy — a new `browseTiles` vocabulary test reading
      the **real** labels, and three text assertions in `RC1`.
      ⚠️ **`Favorites` in the picker was deliberately NOT built** — the critic's second clause. A rename is
      not a new door: a tile brings its own count, suppression behaviour and a place in a four-tile budget
      `3e` already spends on the night's constraint. → `idea-backlog.md`, V1.5.
- [x] **Cooked-when evidence inside pushed doors** — real, and **worse than filed**. `toPickerRecipe` built
      every row's meta as `Saved in {month} · {N} min · never cooked`, with the third segment rendering
      **only in the negative**. So inside the `Cooked` door — where every row carries a stamp by definition —
      it vanished, and each row showed the month it was **saved** and nothing else. Not merely missing
      evidence: a door named for when you cooked something, over rows whose only date is when you saved it,
      invites reading one as the other. The clause now answers in both directions (`Cooked May 2`) using the
      existing `formatCookedDate` — same slot, same length, no per-tile branch, so every other door gains the
      fact too. A stamp that exists but will not parse says **nothing**, because `never cooked` would be the
      one wrong answer available.
      ⚠️ **The existing unit test asserted the defect as the design** — its name was *"should drop the
      never-cooked clause once it has been cooked."* It went red on the fix, which is the right shape of
      proof, but it is a fifth instance of the apparatus encoding the bug.
      **New `L18`, verified failing against pre-fix code** via a physical file backup and a **full rebuild**
      — the red read `"Miso-Glazed SalmonSaved in July · 25 min"`, the defect verbatim from the rendered DOM.
      Only the cooked clause was reverted, not the labels, so the red isolates one cause. It asserts the
      never-cooked half **first**, or it would pass against a build that stamped a date on every row.
- [x] **BUG-046 🟡 CLOSED** — the recipe body's three cream non-pressables, fixed per element rather than
      swept (the fourth `text-primary` on that screen, `View original source`, is a real link and keeps
      cream). Detail in `bug-tracker.md`.
- [x] **Gate: `/visual-qa` Layer A on Recipes + Plan, 0 blockers / 0 high**, all 8 Recipes and all Plan
      capture states `captureStatus: ok`. Captures: `A-recipes-2026-07-31T19-23-06-426Z`,
      `A-2026-07-31T19-21-31-407Z`.
- [ ] ⚠️ **NEW: BUG-047 🟡, found BY this gate and deliberately not swept.** The picker's search placeholder
      reads `Search 5 recipes` while standing inside the `Cooked` door, which holds **2** — it counts the
      `everything` tile regardless of which door is pushed, contradicting S48's own rule that search stays
      inside the room. **Pre-existing, identical in `HEAD`.** Same class as the finding B6 just closed one
      control over. → **B7**, and ⚠️ **it adds a fourth site to B7's three**.
- [→] **Caps-label tracking — MOVED TO B8 (Griffin's call, S55).** Filed as *"three tracked-out caps labels
      in one sheet."* Measured: **~46 caps-label sites across eight different tracking values** (0.5 / 1.2 /
      1.3 / 1.5 / 1.8 / 2px / 0.15em / `tracking-wider`), four sizes and two weights. The spec states
      **exactly two rungs, and they are semantic rather than one number** — **Section eyebrow** (11px / 600 /
      2px / `#A79A8C`, *"names a shelf of content"*) and **Label** (10.5px / 700 / 1.3px / `#A29484`, *"names
      a field or a slot inside a card"*). **Neither exists as a class**, so the next caps label written is
      improvised by default — B3's `ui/button.tsx` condition in a different primitive. This is not a tracking
      tweak, it is the caps half of B8's type scale; doing it here would mean classifying 46 type sites now
      and opening the same files again one item later.

### B7 — Consolidate the freeform-input controls into the single spec §09 control ✅ **CLOSED S56** — *filed as three sites, measured at six*

**Griffin's call at the top, twice.** The mic ships on every surface, **unwired**, with the same honest "not
yet" it has carried in onboarding since S35 — literal §09 conformance, because §09 admits no text-only
version of this control. And B7 covers **all six** sites rather than the three that were filed.

- [x] **The item was filed as three and is six, because §09's own list went stale.** §09 names four controls
      *"a mic-only row in Onboarding, a text-only sheet in You, a bare text input with a round send button in
      Groceries, and a textarea in the chef sheet"* — written in **S39**. **1E.5 rebuilt Plan after that**, and
      nobody re-measured the sentence. The build actually carried: onboarding (done S39), the shared chef
      sheet, Groceries quick-add, **the Plan intent screen** (`no-plan-state.tsx` — the front door of the
      north-star flow), **recipe modify**, and **the generate dialog**. The phase's lesson in its S54 shape,
      inverted: a parked item can be **bigger** than filed, and here the reason was that the spec's list was
      a snapshot of a build that had since changed underneath it.
- [x] **`shared/freeform-field.tsx` is the control**, extracted from `onboarding/tell-me-field.tsx` rather
      than written fresh — that file already *was* §09's worked example, so the item is a route, not a
      rebuild. Mic, growing field (three lines then scrolls, measured from the element rather than
      `field-sizing: content`, which iOS Safari does not support), cream send, all three visible at rest.
      Callers own the draft, because the three surfaces disagree about what happens after a submit
      (onboarding clears only on success, the chef sheet never clears, Groceries clears immediately).
- [x] ⚠️ **The mic and send are 44px, not the 40 §09 draws — a stated deviation, not drift.** §12 item 05
      sets a 44px floor and calls what it fixes *"a real tap failure, not a style nit"*; §11 bands icon
      buttons at 40–46, so 44 is inside the spec's own band. **A floor beats a drawing.** The container grows
      to 56 to carry it, and onboarding's shipped field moves 40 → 44 with it.
- [x] **Three visible consequences, stated rather than buried.** (1) The Plan intent field submits on plain
      **Enter** now, not Cmd/Ctrl+Enter — there is no Cmd key on a phone, and the chef sheet and onboarding
      were already plain-Enter. (2) Groceries' chef launcher moved **out** of the quick-add field and is
      always visible; it used to hold the trailing slot when empty and swap to send once you typed, which is
      the one thing §09 forbids by name (*"the mic does not move or disappear"*). (3) The generate and modify
      dialogs **lost their full-width commit buttons** — the control's send is the commit, and keeping both
      would have put two filled cream buttons in one viewport, B6's finding one screen over.
- [x] **`ui/textarea.tsx` deleted.** B7's changes made it unused, and an unused primitive is not neutral: it
      is the rung the next call site reaches for, which is B3's `ui/button.tsx` finding in a different
      primitive and is how six of these got written in the first place.
- [x] **`freeform-field.test.ts`, a source-scraping guard, verified failing against pre-fix code.** It
      allow-lists every raw `<input>` in the app with a stated reason (search is header pattern B and
      explicitly not this control; a grocery row's in-place edit; the chip adder; the URL field) and names
      the six importers, so the **seventh** control cannot be written by accident. ⚠️ Its first run caught
      two sites and a wrong line number **in my own expectation** — the guard working before it ever shipped.
- [x] **BUG-047 closed with it, and it was NOT a §09 site.** The S55 handoff called it "a fourth site for
      B7"; §09 says in as many words that *"Search is not this control. Searching is not talking."* So it
      rode along as a one-line correctness fix (count the room, not the library) rather than a control to
      rebuild. **New `L19`, verified failing** — `Expected: 2 / Received: 5`.
- [x] **Both Recipes dialogs had ZERO E2E coverage, and the modify one could not have had any** — the E2E
      mock throws on a task it has no fixture for, and there was no `recipe-modify` fixture. So the gap was a
      hole in the **seam**, not a missing spec. Added the fixture (it echoes both the original title and the
      user's request, so it cannot go green on a build that drops the text) plus **RC16** and **RC17**.
- [x] **Gate: `/visual-qa` Layer A, 0 blockers / 0 high across all five surfaces, 56/56 capture states
      `ok`.** Critique in `tests/e2e/captures/A-recipes-2026-07-31T22-39-14-112Z/critique.md`.
      ⚠️ **The gate found one HIGH and it is the same law two sessions running:** the Groceries **organize
      toggle** painted its selected segment as a filled cream button, where §11's gallery states
      *"Segmented… no colour — the selected segment lifts instead."* That is S55's Recipes filter chip one
      surface over — a **state** wearing the primary rung — and it mattered here because B7 puts the §09
      control directly beneath it, so the moment you type, the send fills and the viewport carries two.
      Fixed to the spec's own values; Groceries now carries **zero** filled cream buttons at rest.
      ⚠️ **And the two surfaces B7 changed most had never been capture states at all** — the generate and
      modify dialogs, which is exactly where the commit buttons were deleted. Same class as S47's sheet
      states and S52's `grocery-complete-banner`, with the difference that **the blind spot was pointed at
      this session's own work.** Both added and clean.

### B8a — Caps rungs, motion, component library, and the two tracked bugs ✅ **CLOSED S57** — *B8 was two jobs wearing one name*

**Phase 0 measured all seven sub-items against the build before a line was written.** Six came in smaller
than filed. **One came in six times bigger and split the item** (see B8b): the type scale is **~303 sites
across ~35 distinct sizes** against a 10-rung ladder. Griffin's call: take everything except that here, so
every tracked row closes rather than waiting behind a 300-site sweep.

- [x] **The caps-label rungs (moved here from B6, Griffin's call S55).** `.spec-eyebrow` (11/600/2px) and
      `.spec-label` (10.5/700/1.3px) added, **45 sites routed**. ⚠️ **Measured at TWELVE distinct
      size/weight/tracking combinations, not the eight tracking values S55 counted** — size and weight vary
      independently of tracking. Only **two** sites already sat on a rung. Classification is by what the
      label NAMES: an eyebrow heads a shelf of content, a label names a field or slot inside a card.
      ⚠️ **The classification has a third answer, and getting it wrong is the failure this rule prevents.**
      The memory-card provenance holds *"You told me when we started"* — a sentence. Both rungs are
      uppercase by definition, so routing it there shouted an attribution across every memory card. It is
      **neither** rung; it is Meta, and Meta is B8b. Listed in `caps-rungs.test.ts` with the reason.
      ⚠️ **Colour is a stated deviation from §05.** That section draws the eyebrow at `#A79A8C`, a value
      **§01 does not list** — and §01 states the ramp as *"five steps, descending. Never invent a sixth,"*
      calling a colour outside its row a bug. `#A79A8C` is what the **spec document** styles its own
      eyebrows with, so §05's table is transcribing the document's chrome rather than naming a sixth product
      step. Both rungs take `text-muted` and separate by size, weight and tracking — §05's own "weight
      carries hierarchy" rule doing the work.
- [x] **`Ingredients` / `Steps` → the 19px Group title**, giving B4's orphaned `.spec-group-title` its
      first call sites (it had **zero** consumers; the app's only `text-[19px]` was a stepper numeral). §05's
      own example for that rung is *"a recipe step group"* verbatim. Visible: 14px caps → 19px sentence case.
- [x] ⚠️ **THE FINDING — a class that sets `color` in `@layer utilities` eats every override beside it.**
      The rungs shipped in `utilities`, where hand-authored CSS is emitted **~27KB after** Tailwind's
      generated colour utilities; within one cascade layer source order decides, so **eight call-site colour
      overrides died at once** — five gold eyebrows the gold line requires, and **three safety-weighted red
      labels** including `SAFETY-CRITICAL`.
      ⚠️ **The capture could not catch it.** `--spec-text-muted` is `#A29484`, a warm tan, and at 11px on a
      near-black floor a warm tan reads as "probably gold". The screenshot raised a suspicion and could not
      settle it; **diffing the built CSS did.** A colour regression that small is **below the resolution of a
      judgement call** — the visual layer was not the wrong instrument, it was an insufficient one.
      Fixed by moving all four type rungs to `@layer components`, which is the relationship they should
      always have had: the rung names size/weight/tracking, the call site decides colour per the gold line.
- [x] **Motion.** The spec's standard curve `cubic-bezier(.2,.9,.3,1)` appeared **nowhere in `src/`**, and
      ~60 `transition-*` sites ran on Tailwind's implicit 150ms against a spec naming 120/180/260/340 —
      **zero overlap**. Four duration tokens + the curve added, and the press rung wired as Tailwind's
      **default**, so every bare `transition-*` moved on-system without touching a call site. Six looping
      `animate-pulse` skeletons → `.spec-skeleton`. ⚠️ **Stated deviation:** §11 says only the chef may loop
      and this loops — a user action *is* behind a skeleton, and a frozen block reads as a screen that
      failed, which is BUG-035's exact lesson. It keeps the loop and loses the throb.
- [x] **Component library: `ui/badge.tsx` deleted** — **0 importers**, B7's `ui/textarea.tsx` case in a
      second primitive, and its default variant was `bg-primary`. No other duplication survives; `shared/`
      already holds the commons A3 and B7 extracted.
- [x] **The `bg-primary` audit — and the doc's "32 call sites" was wrong.** Measured: **14** real
      `bg-primary` sites (two of the sixteen hits are comments). Classified by what the hue *claims*:
      the **progress-bar fill** was the action hue on a status you cannot press (B1's draft pill one surface
      over), and the per-item grocery checkbox + got-it check filled **cream** while B1 had routed the
      completion banner to `#9CB86F` — the same screen saying "done" in two hues. All three → `#9CB86F`
      (Griffin's call). ⚠️ **The starting point the S56 handoff named turned out to be the weakest of them:**
      You's `Talk to the chef` is the only filled cream on that tab at rest, so law 06 holds as a ceiling and
      it stays.
- [x] **BUG-045 🟡 CLOSED** — the last `#FF9F0A` → flat meta type. ⚠️ Its `palette.test.ts` allow-list is
      **gone, not emptied**; the test now asserts zero amber anywhere.
- [x] **BUG-048 🟡 CLOSED, and it was not the chip redesign it was parked as.** Measured: all three call
      sites wrap at `gap-2`, so a 44px target centred on the glyph overhangs **6px into an 8px column gap**
      and **4px into an 8px row gap**, with **no target-on-target overlap** (a neighbouring chip's body is
      not interactive). S56's Groceries drag-handle trade transfers exactly: real 44px box, equal negative
      margin, chip stays 36px, hover fill stays on a 20px inner span so nothing is visible. Its `SH2`
      exemption went with it and the allow-list is asserted **empty** — granting a future one is deliberately
      a two-place change.
- [x] **`SH4` — law 06 stops being a rule the judge has to remember.** A DOM sweep counting filled-cream
      controls per viewport across five surfaces. **It found a real break before it ever ran:** the Plan
      intent screen carried the §09 send AND a full-width `Build my first week` on the seeded onboarding
      hand-off — the front door of the north-star flow, and the **third consecutive session** this law broke.
      ⚠️ **The first fix softened the wrong half, and the visual pass caught it.** The field arrives
      pre-filled, so both controls fired the same call with the same argument — **one action drawn twice**,
      not two primaries competing. **Griffin's call (S57): delete it**, which is B7's precedent for the two
      dialogs. The chef-decides link is now unconditional and is the no-typing path in both states. `OB4` now
      asserts the **field carries a value** rather than the button's presence — the hand-off's promise is
      that the interview's sentence survives the trip, and a button never proved that.
- [x] **`SH5` — a type rung must not eat the colour written beside it**, added because it happened. Both new
      guards verified failing for the predicted reason: `caps-rungs.test.ts` at 50 offenders vs 3 allowed,
      `SH5` at `Expected rgb(240, 194, 101)` / `Received rgb(162, 148, 132)` — `--spec-text-muted` exactly.
- [x] **Gate: `/visual-qa` Layer A across all five surfaces, 0 blockers / 0 high, 56/56 states `ok`.**
      Critique in `tests/e2e/captures/A-2026-08-01T00-32-37-100Z/critique.md`.

### B8b — The rest of the type scale ✅ **CLOSED S58** — *six of the ten rungs had no name*

**Re-measured before scoping, and the numbers had already moved.** S57 filed 22 rem sites / 53 `text-sm` /
29 `text-xs`; S58 measured **27 / 51 / 28** — B8a's own edits had shifted the field it was scoped against, in
one session. Every number in the filing was treated as a hypothesis after that.

**The real shape: 255 type sites, 30 distinct sizes, 192 of them off the ladder.** The `~303` counted test
files too.

- [x] ⚠️ **THE FINDING — six of §05's ten rungs did not exist as classes.** B8a named two; B4 had named two
      more. The other six — H1/32, H2/26, H3/22, Body/13.5, Chef voice/14.5, Meta/12.5 — had **no name at
      all**, which is why 192 sites were improvised. B3 found this in `ui/button.tsx` (every icon rung under
      the 44px floor), B7 in `ui/textarea.tsx`, B8a in the caps rungs. **Fourth instance: an unnamed rung is
      a defect generator, and this time it was most of the ladder.** All six added; **169 sites routed** onto
      all ten; adoption is now 218 rung call sites against 71 hand-typed sizes (from 255).
- [x] ⚠️ **THE ONE TO READ — the fix applied correctly and was overridden by what was already there.** The
      rungs live in `@layer components` (B8a's fix, so a call site still owns colour). That means **any**
      leftover utility beside the class beats it. The first routing pass left **81 lines** where the rung was
      applied and a `font-bold` / `leading-tight` / `tracking-tight` / `italic` next to it was still deciding
      the property — **the class present, correct, and doing nothing.** Invisible to the screenshot (type
      looks like type), to the DOM (the class *is* on the element) and to `SH5` (it measures colour). Only
      reading the class string shows it. `type-scale.test.ts` asserts it; **81 → 0**.
- [x] ⚠️ **The chef's voice was drawn at three sizes, and eight non-chef sites sat on its rung.** §05 reserves
      14.5/400 italic gold as *"the only coloured running text in the product."* The build had the chef at
      **13.5px (×4), 14.5px (×1) and 15px (×1)** with `italic` and `--spec-gold-voice` hand-typed beside each,
      while **eight sites that are not the chef** sat on 14.5px because it was a convenient size. ⚠️ **The
      filing's claim that the rem sites "need no judgement at all" was false here:** `0.9rem` = 14.4px, whose
      nearest rung by pure distance **is** the chef rung, so distance-matching would have put five ordinary
      labels (an answer chip, a toast, a field label, a memory body, a retry button) into gold italic. Routed
      by **who is speaking**, never by size. B8a's memory-card provenance, one rung over.
- [x] **§08 governs controls, and the ladder does not.** The spec's own gallery draws buttons at
      **15 / 14.5 / 13.5px**, and **15px is deliberately not a §05 rung** — so button-label type was never
      B8b's to sweep. Same for text inputs (16px, the iOS zoom floor) and the two stepper numerals. **84
      sites left alone on purpose**, plus `ui/` (B3's precedent: change a primitive deliberately), `debug/`
      and the tab bar's 10px chrome label.
- [x] **The four `caps-rungs.test.ts` allow-listed sites all closed, and the allow-list is DELETED rather than
      emptied** (BUG-045's precedent). Three took `.spec-label` after all — the stray tracking was the only
      thing that had made them look like something else — and the memory-card provenance took `.spec-meta`,
      which is the answer B8a wrote down and could not act on until the Meta rung existed.
- [x] **`type-scale.test.ts` (4 assertions), verified failing against pre-fix code** by physical backup +
      `git show main:` revert: it went red on `meal-row.tsx:155`, the hand-written gold italic, the predicted
      site. ⚠️ It also **caught a site the sweep missed** before it ever ran — `floating-slot.tsx:150`, a
      toast whose ternary switches between an error and the chef, which is two rungs rather than one rung in
      two colours. ⚠️ **And it failed against its own comment**, because `memory-card.tsx` quoted the class
      string the regex forbids — `palette.test.ts`'s lesson, third time.
- [x] ⚠️ **The guard's honest limit is written into it.** It cannot tell a content site with no rung from a
      control that is allowed a raw size — that is a question about what the text *does*, and the string does
      not say. So it does not pretend to: it **ratchets** at 71, because thirty sizes accumulated one
      reasonable-looking `text-[13px]` at a time.
- [x] **Built-CSS proof, not a screenshot.** All ten rungs sit at bytes 10618–11619 inside `@layer components`
      (10600–11739); every call-site colour utility sits at 37345+ inside `@layer utilities` (11740–67336).
      Overrides now win **by layer rather than by source order** — strictly stronger than what B8a restored,
      since source position can no longer decide it.
- [x] **BUG-049 🟠 filed, not swept** — five text inputs under 16px zoom the iOS viewport on focus, including
      both grocery inline edits. **The fix goes UP to 16px, which is not a rung**, so it cannot ride inside a
      type item → 1F/C.
- [x] ⚠️ **The visual pass found one thing, and it is the honest headline: `BREAKFAST` collided with the meal
      title on every compact row at multi-meal density.** The label column is a hard `w-[62px]`, sized for the
      type that label wore **before B8a gave it `.spec-label`** — the rung's 1.3px tracking pushes the longest
      meal type past it, so the two strings met with **no gap at all**. **Pre-existing, and S57's `/visual-qa`
      cleared the identical frame at 0/0** (confirmed by diffing the two `dense.png` captures).
      ⚠️ **This is NOT B8a's precision problem and the difference matters.** That was a warm tan against gold
      at 11px, genuinely below the resolution of a judgement call. **This is two words touching** — visible at
      a glance, in a frame the gate captured, kept and passed. The layer was neither blind nor imprecise; it
      **was not read carefully enough.** S55 found a rule present, correct and unrun; this is a *frame*
      present, correct and unlooked-at. Fixed by widening the column to 74px at both call sites, **never by
      forking the rung's tracking** — which is what `type-scale.test.ts` exists to forbid. Re-captured.
- [x] **Gate: 705 unit (+5) green, lint + typecheck clean, `/visual-qa` Layer A across all five surfaces at
      0 blockers / 0 high, 56/56 capture states `ok`.** Critique in
      `tests/e2e/captures/A-2026-08-01T14-46-03-312Z/critique.md`.

**⚠️ Three visible changes, stated rather than buried.** The Plan rail's **date numeral** goes **16 → 19px**
(the day marker is one heading in two parts — the caps day name stays the eyebrow, the numeral takes the Group
title rung as its dominant half; ⚠️ a judgement, not a lookup, since S54 flagged a 19px stepper numeral as the
wrong tenant for that rung and the difference is what the slot HOLDS); the solo meal row's title goes 16 → 15.5
and loses its size ternary (both densities are the same object); and **body copy that previously inherited
`--foreground` now takes the Body rung's `#CAC4BC`** — visible on the recipe detail's ingredient and step
lines, `past-meal-row`, and the Recipes toast. That last one is the spec correcting sites that were
over-bright, but it is a real change and `/visual-qa` should be read with it in mind.

**⚠️ Deliberately NOT done, and it is the obvious next item.** Controls run at **13 distinct sizes** against
§08's three. That is the same defect this item just fixed, one section over, and it is the reason 71 raw
sizes survive. It is not §05's, so B8b did not take it — but it should be a tracked row rather than a number
in a test file.

### B9 — Recipe-detail empty states ✅ **CLOSED S53** (BUG-038 🟡, BUG-037 🟠) — *the filed bugs were the smaller half*

Both were caught by Layer A in S47 and both are 1F-routed loading/empty-state work.

- [x] **BUG-038** — each section is omitted when its array is empty; when **both** are, one line of flat
      muted type (`No ingredients or steps on this one yet.`), centred with `py-12` so it reads as a
      deliberate state rather than a caption orphaned under the meta. No fill and no border — law 05
      reserves a container for something that responds to a tap. Reachable in production via an
      un-hydrated draft or a failed URL import, which is why the copy names the state and **invents no
      cause**: from the screen those two are indistinguishable.
- [x] **BUG-037** — the refusal stays (answering a fast tap from "no data yet" would send someone with a
      live week to the intent screen); what changed is that it says so. The verb reads
      **`Checking your week…`** while `plan.current` is in flight instead of an unlabelled dim.

- [x] ⚠️ **THE REAL FINDING, and it was three times the size of both bugs.** `seed.ts` hard-coded
      `ingredients: []` / `steps: []` for **every** recipe the Recipes seeder produced. So BUG-038 was not
      an edge case in the harness — it was **100% of seeded recipes**, and
      `recipes-detail-add-to-week`, the tab's only detail capture, **had never once shown a populated
      recipe body.** The visual gate was grading the degenerate state as the canonical one. Fixing BUG-038
      without fixing the seed would have made the gate *blinder*: that capture would have become the
      "nothing here yet" fallback, graded as normal. `SeedRecipe` now carries real bodies, with **exactly
      one** recipe left deliberately body-less (the un-hydrated plan draft) so both states stay reachable.
      Third instance of *ask what the layer cannot see* (S47 sheet states, S52 `grocery-complete-banner`),
      and the sharpest: here the state existed but was silently the **wrong** one. Both later seeders
      (`seedPlanState`, `seedGroceryState`) already wrote real ingredients — this one was the outlier.
- [x] **A second gate-blindness, self-inflicted and older.** `recipes-facts.ts` waited on
      `[data-testid="add-to-week"]:not([disabled])` before shooting — a workaround that stepped around
      BUG-037 and made the visual layer structurally unable to see it. Now two distinct states:
      `recipes-detail-checking-week` (held open by a **routed delay**, not a throttle, so it does not
      depend on machine speed — S50's rule) and the settled `recipes-detail-add-to-week`.
- [x] **New capture state `recipes-detail-empty`.** ⚠️ Its first run shot the verb mid-load and came back
      reading `Checking your week…`, conflating it with the loading state so neither graded cleanly — my
      own race, fixed by waiting for the settled verb.
- [x] **RC14 + RC15, both verified failing against pre-fix code** via a physical file backup and
      `git show HEAD:` restores — never chained `stash && test && pop` (S52's false-red lesson). Both reds
      named the predicted cause: RC15's output showed the `disabled` button still reading
      `"Add to this week"`, and RC14's accessibility snapshot showed `heading "Ingredients"` and
      `heading "Steps"` rendered over nothing on the body-less draft — BUG-038 verbatim. **RC14 asserts in
      BOTH directions on purpose**, because "the empty recipe hides the cards" alone would also pass
      against a build that deleted the sections outright.
- [x] **Gate: all 8 Recipes capture states `captureStatus: ok`.** The long void beneath the empty state was
      left alone deliberately — `recipes-empty`, which has cleared several `/visual-qa` passes at 0/0, sits
      the same way, so matching it is consistency with the shipped system rather than a defect. Changing it
      would be the new all-states pass this phase forbids.
- [ ] ⚠️ **NEW: BUG-046 🟡, deliberately not swept.** Populating the seed made a surface visible for the
      first time, and it carries **B1's exact finding**: `bg-primary` on the ingredient bullet,
      `text-primary` on the step-duration meta and on the `Modified` badge all resolve to cream
      `#F4EBDC` — the *action* hue — on three things you cannot press. Proven from the token chain
      (`text-primary` → `--primary` → `--spec-action`), not from eyeballing a capture. The fourth use,
      `View original source`, is genuinely a link and is correct, which makes this a per-element semantic
      call rather than a token sweep. Routed to **B6/B8** per S52's BUG-045 precedent: B9's scope is
      loading/empty states, and repainting a surface Griffin has never been shown is exactly the
      adjacent-code improvement the rules forbid.

---

# Workstream C — PWA

*Decided 2026-07-24: R1 ships as an installable PWA folded into this phase; native iOS/Android stays held
pending a real capability (push/camera), validation, or a distribution trigger. Roughly one slice.*

**⚠️ Why C is not optional before validation (Griffin, S52).** The two validation weeks are the expensive,
uncompressible resource, and **the PWA is how Griffin actually intends to use the product.** Validating in a
browser tab would spend those two weeks on a configuration that is not what ships — the result either does
not transfer or has to be re-run. *(Claude argued for pulling D's instrumentation forward and starting the
clock ~2 weeks earlier; Griffin overruled it on exactly this ground, and the reasoning is recorded in
`decisions.md`. The order stays **B → C → D → validate**.)*

> ### ✅ THE DESIGN ROUND RAN (S60) — three artifacts locked, one CUT, one collapsed
>
> **Result: [`docs/design/surfaces/pwa/directions.dc.html`](design/surfaces/pwa/directions.dc.html).** The
> brief carries the amendments; this is the summary.
>
> | Filed as | Outcome |
> |---|---|
> | App icon | ✅ **`1a` "Ember"** — orb at 54% of the 1024 artboard, toque at **every** size (one raster downsampled; dropping the toque at 60px would mean shipping two icons) |
> | Launch screen | ✅ **`1e` "Hero"** — orb at 88, frozen at the top of the ember cycle. ⚠️ **`light.hero`, not the brief's `light.ambient`** — §03 defines hero as *"only where the orb is"*, and the splash **is** nothing but the orb, so the brief was applying the wrong rule |
> | Install prompt | ⛔ **CUT — see the bullet below** |
> | Offline grocery list | ✅ **`1h` "The clause"** — offline is **four characters appended to the count**: `18 / 34 · offline` |
> | Queued-changes indicator | ✅ **Collapsed into the clause.** Not a separate artifact |
>
> ⚠️ **The offline treatment is much smaller than this scope doc assumed, and deliberately so.** No banner,
> no strip, no per-row badge, no second sentence. Meta type, caption colour, **no fill and no border** — so
> law 05 never applies and there is nothing to tap or dismiss. Things offline genuinely breaks go
> **provisional** (`rgba(240,222,190,.09)` fill, `.2` line, `#A29484` label) and **keep their ordinary
> label** rather than each explaining themselves. **The queue is deliberately NOT counted** — a running
> tally invites worry about a promise the app has already kept. Flushing is **one 180ms crossfade** to
> `· sending` then a 180ms exit, never a loop, because only the chef loops. **The resolution is an
> absence:** nothing confirms, nothing lands, nothing needs dismissing.
>
> ⚠️ **The tick must be pixel-identical offline** — same cream fill, same 120ms press, same dim-and-strike.
> No dashed box, no clock badge, no per-row anything. *The queue is a fact about the app, not about the
> onion.*
>
> ⭐ **One scope line the round added:** a held tick that fails permanently (the item was deleted on the
> other phone) is a **conflict, not an offline state**, and is out of scope here — named explicitly because
> the instinct is to reach for a red dot, which would put an error hue on the one screen this artifact
> exists to keep calm. Cannot happen in R1 (solo accounts); it is a V1.5 question.

**🎨 Design pass: RECOMMENDED for this workstream — and this is a reversal of the "skip it" call that
applies to B.** B applies a locked spec to screens that are already designed, so a design round would only
re-litigate settled decisions. **C is net-new surface that exists in no spec and no mock:** the app icon,
the splash/launch screen, the install prompt, and the offline grocery-list state. It is also the surface
Griffin sees every time he opens the app from his home screen, and he has said explicitly that he wants it
to look and feel finished so his validation-week feedback can be about design rather than about gaps.

- [x] **Web app manifest + home-screen icon set** ✅ **S59.** ⚠️ **`scope` is the load-bearing field and
      the plausible value breaks sign-in silently.** iOS opens out-of-scope URLs in an in-app
      SafariViewController with storage **isolated** from the PWA, returning only when the external site
      redirects back *into* scope. Google OAuth leaves for `accounts.google.com` and returns to
      `/auth/callback`, where `exchangeCodeForSession` sets the session cookie **server-side on the
      redirect response** — so the cookie lands in whichever container made that request. Scope it to
      `/plan` (the obvious choice, since that is where the app lives) and the exchange completes in the
      in-app browser: the PWA never sees the cookie and bounces to `/login` forever, **with no error
      anywhere.** `manifest.test.ts` reads the auth routes off disk and asserts scope covers them.
      Icons generate from **one 1024 artboard** via `npm run icons` — a hand-kept set of ten PNGs drifts,
      and the one that drifts is the 180 the phone actually renders. iOS reads the `apple-touch-icon`
      **link tag**, never the manifest's `icons` array.
- [x] **Service worker + offline shell** ✅ **S60.** S59 was right that this bullet was two mechanisms that
      do not overlap — the shell is GET and a worker caches it; the list arrives over `httpBatchLink`,
      which is a **POST**, and the Cache API rejects `Cache.put` on non-GET. Both halves shipped:
      `public/sw.js` for the shell, React Query → IndexedDB for the data.
      ⚠️ **The finding S59 could not have predicted, caught by running the specs rather than by reasoning:
      a service worker does not control the page that registers it.** That navigation is already in flight
      when `register()` runs, so the **first visit to a route never reaches the fetch handler and never
      gets cached** — and the worker then activates and reports itself healthy holding **nothing**. In a
      browser tab that is invisible (tomorrow's visit caches it). In an **installed PWA it is the whole
      feature failing on the launch that matters most**: install, open once, walk to the shop, dead page.
      Fixed by warming the four tab routes on `activate`, through the same `isCacheable` gate so a worker
      activating while signed out fetches four redirects and stores none.
      ⚠️ **Persistence is via superjson, not JSON** — `grocery.current` returns Drizzle rows whose
      `createdAt`/`updatedAt` are real `Date`s, so a JSON persister hydrates them back as **strings** and a
      cached list is silently a different type from a fetched one. And the persisted set is an
      **allow-list** (BUG-018's argument): a deny-list fails open, and the cache would otherwise hold the
      chef's memories, the interview's health answers and the children's ages in unencrypted on-device
      storage.
- [x] **Queued check-off** ✅ **S60** — added S59 on Griffin's call, widening "read only". In a shop the
      verb is *tick*, not *read*; a list you cannot mark is a photograph of a list.
      ⚠️ **This is not the half it looks like, and the smaller version is worse than nothing.** Persisting
      the query cache alone is an **illusion of saved work**: `onMutate` writes the tick optimistically and
      the query stays `success`, so the ticked list persists. Tick five items, let iOS evict the
      backgrounded PWA over a 45-minute shop, relaunch — **the ticks are still there, because they were
      persisted** — then signal returns and the server refetch wipes all five, because the mutations died
      with the process. The user watched their work survive a relaunch and reasonably concluded it was
      saved. **That is Griffin's own rejected case with a longer fuse.** So paused mutations are persisted
      too, with `mutationFn` defaults registered on the QueryClient — a restored mutation has no component
      to get one from and resumes into `undefined` otherwise.
      ⚠️ **Residue: the app-kill path is verified by construction, not by the suite.** Playwright cannot
      reproduce an iOS process kill. OF3/OF4 cover pause-and-flush within one session; the cold-start
      replay is the first thing to check on a real phone.
- [x] ⛔ **Install prompt — CUT S60, by the design round.** ⚠️ **This is scope removed, not scope done.**
      The reasoning: two users, both told how to add it by hand before they ever open it. An in-app prompt
      would spend the product's first act teaching a browser gesture **the app is not allowed to perform**
      (iOS Safari has no install API — `beforeinstallprompt` does not exist there) to an audience that
      already knows it. The brief had spent a section designing around that as an *"honest awkwardness"*;
      the round's answer is that **the awkwardness was the tell.** Revisit only if the audience widens
      before the native build. Nothing else in C depends on it.
- [x] **The app icon** ✅ **S61** — direction `1a` "Ember" built to the artifact's stated values and
      `npm run icons` re-run; the S59 placeholder is gone. ⚠️ **Three of the placeholder's numbers were
      wrong, and each one was a CSS value transcribed into SVG by eye rather than by its definition.**
      (1) `radial-gradient(circle at 40% 34%, …)` carries an implicit `farthest-corner` extent, so the
      radius is `sqrt(.6² + .66²) = 0.892` of the sphere's box — the placeholder guessed `72%`, and CSS
      also holds the last stop's colour to the edge rather than fading out, so the 78% stop repeats at
      100%. (2) A **box-shadow blur radius is TWICE the Gaussian σ**, so `282px` is `stdDeviation 141`,
      and the `-51px` spread shrinks the shadow's own circle. (3) The glow is **masked to outside the
      sphere**, because an outer box-shadow is clipped to outside its border box — and this sphere's
      outer stop sits at `.42` alpha, so an unmasked glow shines through the rim and quietly makes the
      ember a different object. Verified by **sampling the rendered pixels against the arithmetic**
      rather than by looking at it: highlight `247,230,189` against a predicted `247.8,231.2,190.4`,
      wash `50,38,18` against `49.9,37.8,18.2`, floor exactly `#0F0B08`.
      ⚠️ **The toque is lucide's CURRENT `ChefHat`, not the older path the design frame's HTML quotes.**
      The artifact's own instruction is *"§02 transplanted, nothing else"*, and §02's toque is whatever
      `chef-presence.tsx` draws; the splash hands off to a screen drawing this exact object at 88px, so
      it has to be the same object. It is also **box-scaled at 41% of the sphere (227px)**, which is what
      the artifact's `At 1024` block states — the placeholder had scaled it by the ink instead and
      produced a hat ~8% larger, complete with a comment arguing for it. **The locked value wins over the
      reasoning that predates it.**
- [x] **The launch screen** ✅ **S61** — direction `1e` "Hero", `light.hero` per the round's amendment.
      Eleven portrait PNGs (every iPhone back to the SE2) generated by a new `scripts/generate-splash.mjs`,
      plus one `apple-touch-startup-image` link tag each. ⚠️ **The tags and the files are generated from
      ONE table** (`src/assets/splash-devices.json`) rather than hand-kept beside each other: a tag with
      no file gives a white flash on launch and a file with no tag is never shown, **both in complete
      silence**, and the size that drifts is the one in the pocket. `splash.test.ts` holds them in step
      in **both** directions and additionally scrapes `layout.tsx`, because without that the whole file
      would stay green against a build that had dropped the tags entirely.
      ⚠️ **No status bar and no home indicator are PAINTED, and that is what "status bar and home
      indicator in" means.** iOS draws both itself, over the launch image. The frame draws them because a
      mock has to show the screen in situ; painting the frame's `9:41` into the PNG would put a second,
      permanently wrong clock underneath the real one.
      ⚠️ The ratio clause in each media query is load-bearing: **iPhone 11 and 11 Pro Max are both
      414x896pt** and differ only by pixel ratio, so a query matching on size alone would match both and
      hand one of them the wrong raster.
- [x] **The offline clause** ✅ **S61** — direction `1h`. `· offline` / `· sending` appended to the
      Groceries count; the chef launcher is the only control that changes, taking the existing
      **`.spec-provisional`** rung (already byte-identical to the artifact's `.09`/`.2`) under its
      ordinary label. Driven by React Query's **`onlineManager`**, not `navigator.onLine`, because that
      is the thing deciding whether a mutation pauses — reading anything else lets the word and the queue
      disagree, which is the only failure that matters here.
      ⚠️ **The naive rule is wrong and the unit test exists to say so.** "Online and a pending tick" puts
      `· sending` on screen for **every check-off the app ever makes**; only a *paused* tick may start a
      hold. That also covers the cold-start case for free, since a mutation restored from IndexedDB is
      paused until it resumes. Verified failing against exactly that naive implementation.
      ⚠️ **Shipped as a crossfade, corrected to a fade-swap, and the correction is the finding.** Two
      stacked words in one grid cell is a true crossfade — and puts `· offline` and `· sending` in the
      element's `textContent` **simultaneously**, so the header announced two contradictory words at once
      to anyone not looking at it and every text assertion read `· offline · sending`. Neither opacity
      nor `visibility: hidden` helps: `toHaveText` reads `textContent`. **At four characters of 12.5px
      caption type a fade-swap and a crossfade are the same thing to look at; announcing two
      contradictory states is not.**
- [ ] ⚠️ **`/visual-qa` on Groceries — BLOCKED, BUG-053 🔴, and it is not S61's.** The pass owed for the
      offline clause could not run: two seeded states never render and a third hangs on an unbounded
      `.click()`, so the run dies at 120s **without writing a manifest** and the surface goes ungraded.
      Reproduced with the entire source tree at `HEAD~1`. ⚠️ **The last successful Groceries capture
      predates the service worker by three and a half hours** (15:01 PDT vs 18:42 PDT on 2026-08-01), so
      **no Groceries capture has ever run against a build containing it** — and S60's *"0 blockers / 0
      high, 56/56 states ok"* was reported from that earlier run. **C cannot be called closed until this
      is fixed**, because the gate currently answers 0/0 by not looking.
- [ ] Launches full-screen without browser chrome — ⚠️ **`statusBarStyle` is `black`, not
      `black-translucent`, and that is a measurement.** Translucent extends the web view *under* the status
      bar and needs `env(safe-area-inset-top)`; there is **not one `-top` inset anywhere in `src/`** (every
      inset in the app is `-bottom`, for the tab bar). Translucent today puts every screen title under the
      clock. Going translucent belongs with this workstream's design artifact, not beside a meta tag.
- [ ] **Verified on Griffin's phone and his wife's**, not in a desktop emulator. This is the item most
      likely to be quietly wrong on a real device.

**⚠️ S59 — the finding that nearly made C a dead icon, and it was not in this list.** Gate 1
(`SITE_ACCESS_CODE`) was a **cookie**, and a PWA's cookie jar is isolated from Safari's — so a freshly
installed app opened at `start_url` with an empty jar, hit the gate, and got the deliberately-blank 404
**with no address bar to escape it.** Underneath that, `/manifest.webmanifest` was not excluded by the
proxy matcher and **a browser fetches a manifest with `credentials: "omit"`**, so it 404'd regardless — and
a failed manifest fetch is **silent**, producing a plain bookmark with Safari chrome rather than a
standalone app. Griffin's call: **gate 1 retired** (`decisions.md`, S59), the manifest exempted anyway
because the exemption is correct either way, and `ALLOWED_EMAILS` untouched.

**⭐ BUG-049 rode in here and closed (S59)** — six sites, not the five filed. See the tracker.

---

# Workstream D — Production readiness

> **⚠️ FACTUAL CORRECTION, S62 — one of this workstream's named security subjects is FALSE.**
> Three drafts of this section (and `whats-next.md`, and two kickoff prompts) state that the offline
> cache holds *"the shell HTML, SERVER-RENDERED with the household's real content baked in."* **It does
> not.** Measured: all four cacheable routes fetched with a real session, once against an empty household
> and once against a fully seeded one — **byte-identical MD5s**, zero household strings, zero uuids, zero
> tokens. Every tab route is a thin server component wrapping a `"use client"` child that fetches over
> tRPC **POST**, which is the exact reason `persister.ts` exists and is written in that file.
>
> **What survives is real and smaller:** the **IndexedDB** half genuinely holds the grocery list in
> cleartext on-device, and its allow-list is genuinely closed (verified — `grocery.current` +
> `staples.list`, fail-closed by construction). The service worker's shell cache holds app chrome only.
>
> **Why this is recorded rather than quietly edited:** the claim was written once in S60 and repeated
> verbatim into three documents, where it became a named subject of a security review nobody had checked
> it against. **Fourth instance of the pattern** — after the cold-user premise, the feedback-capture
> bundling, and §09's stale four-controls sentence. The check is the same one S60 wrote down: *does every
> item on a list survive being measured, or only being repeated?*

> **⚠️ FACTUAL CORRECTION, S63 — this workstream's OTHER named input does not exist either.**
> *"Observability: PostHog **with the event taxonomy from S9**"* appears in this doc, `scope-v1.md`,
> `whats-next.md` (×4), `idea-backlog.md` and two kickoff prompts. **There is no such taxonomy.** Its only
> source is one changelog line ([changelog.md:3545](changelog.md#L3545) — *"event taxonomy defined (30+
> events across 8 categories)"*), and the artifact lived in
> `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md`, which
> [plans/README.md:10](plans/README.md#L10) records as **LOST** since S18: never committed, deleted,
> unrecoverable.
>
> The plan's *phase-skeleton* half was consciously rescued into `scope-v1.md` at S19. Its *taxonomy* half
> was not — and nobody noticed for 44 sessions, because nothing needed it until D opened.
>
> ⚠️ **The same S9 decision row carries a second claim that is false in effect:** *"vendor abstraction
> layer built in Phase 1."* `src/lib/analytics.ts` existed — **15 lines of dev-only `console.log` with zero
> call sites in the entire app.** The file's existence is what made the claim read true.
>
> **FIFTH instance of the pattern**, after the cold-user premise, the feedback-capture bundling, §09's
> four-controls sentence, and S62's server-rendered-shell claim. ⚠️ **And the sharpest variant yet: this one
> was a claim about an ARTIFACT that a different doc, in the same repo, already recorded as destroyed.**
> The two facts sat four files apart for 44 sessions and nobody joined them. Consequence: D3 was
> design-from-zero, not install-and-port — see `docs/observability-taxonomy.md`.

**S64 progress.** ✅ **(3) observability — DONE AND VERIFIED**, including the owed real-recording check,
which found and closed **BUG-060** (session replay was recording the grocery list, meal titles, recipe
titles and dietary constraints in the clear, through `aria-label` — attributes are outside every masking
hook the vendor exposes). ✅ **BUG-059 CLOSED** — posthog-js's own bot filter silencing the headless test
browser, upstream of all four suspects the tracker had eliminated; **no production code changed.**
**S65 progress.** ✅ **BUG-058 CLOSED — it was a real product bug, and S64's fix closes it.** The full suite
on a verified-idle machine gives **142 passed / 0 failed (19.5m)**, so S64's failure was CPU contention
(vitest + lint + typecheck running inside the run). ⚠️ **But that alone proves nothing**, which is the
carry-forward: a green run cannot separate *the bug is gone* from *the trigger did not fire*. A CPU dial over
CDP (`tests/e2e/harness/cpu-throttle.ts`) made it decidable — **pre-fix at 4x fails with `value: ""` and
`disabled: true`; post-fix at 4x passes.** ⚠️ **S63's remount was the right mechanism all along**; it was
filed off a code read, dismissed at S64, and confirmed at S65 by measurement — *at full speed the remount
never fires*, so the defect and its fix were both invisible in every fast repro. New **`X7`** pins it at 4x
(force-failed against `eb9343b^`); the S64 probe is removed from X6. **143 specs, all green.**
🔴 **THE ONLY THING NOW BLOCKING D's observability half is the PR #28 MERGE**, which BUG-058 was gating.
✅ **The production env vars are SET** (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`,
`SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT`, `ALLOWED_EMAILS` — S64, commit `3656851`) but **inert until the merge**,
because `main` holds none of the observability code. ⚠️ **Do not redeploy production before the merge.**
Still Griffin's: **one sentence to his wife that session replay exists** before real recording begins.

**S63 progress.** ✅ **(3) observability — the taxonomy, both SDKs, the masking posture and the whole
north-star funnel.** ✅ **BUG-054 shipped** (Griffin's call). See the S63 rows below.

**S62 progress.** ✅ **(2) migration safety — DONE** (rule + `migrations.test.ts` + `pg_dump` discipline).
✅ **(5) BUG-044 — CLOSED.** 🔨 **(1) security review — PART DONE**: authz/IDOR sweep across every router,
rate limiting, SSRF, the access gates, the offline cache. **Still owed: prompt-injection review, RLS
verification, secrets audit.** ❌ **(3) observability — not started, and it gates Workstream E.**
❌ **(4) the wife's account — Griffin's five minutes.** New rows: **BUG-054** (Groceries has no heading in
its generating/error/empty states — lands with the a11y sweep) and **BUG-055** (`clearOfflineState()` is
not called on the revocation paths).

- [x] **Observability: PostHog + Sentry ✅ S63** — the taxonomy is **designed, not ported** (see the
      correction above): **34 events across 8 categories** in `docs/observability-taxonomy.md`, typed in
      `src/lib/analytics/events.ts` so a wrong name or missing property **does not compile**.
      ⚠️ **No property can carry user content, and that is a compile error too** — a type-level guard fails
      `npm run typecheck` naming the offending event if any property is a wide `string` outside the opaque-id
      allow-list, so "just send the item name, it'll help debug" is un-buildable rather than un-reviewed.
      **Both vendors go DIRECT, no reverse proxy** — see the note under Sentry below; that is one rule for
      both rather than two.
      ⚠️ **8 of 34 events are actually WIRED**, and the doc says so loudly in its own status section. The
      wired set is the complete north-star funnel plus the two lifecycle events, which is exactly what the
      DoD and Workstream E need; the other 26 are typed and one line each at a known seam.
      **`wiring.test.ts` reads `src/` off disk** and fails if an event is claimed wired and never called, or
      called and not claimed — because "a table of events reads as a working pipeline, and is not one until
      something calls it" is this workstream's own lesson turned into a guard.
- [x] **⚠️ Analytics is OFF for every automated run ✅ S63** — enabled only by the presence of
      `NEXT_PUBLIC_POSTHOG_KEY` (an allow-list), and **both Playwright configs pin it to `""` in
      `webServerEnv`**. That variable is inlined at BUILD time and both suites build inside their own
      webServer command, so an explicit empty value beats a real key in `.env.local`. Without it, a
      139-spec run plus 55 capture states fabricate hundreds of rituals and grocery lists that then land in
      the DoD's *"time-to-list < 10 minutes on a **real** week"* **as data** — real events, plausible
      numbers, and the only tell is that Griffin did not do any of it. `analytics-config.test.ts` scrapes
      both configs and fails if either line is removed.
- [ ] ~~**Observability: PostHog** with the event taxonomy from S9, **+ Sentry.**~~ Without this, the
      two-week validation run produces anecdotes instead of the time-to-list measurement the DoD requires.
      ⚠️ **And, per Griffin (S52), that is the smaller half of why it comes before validation:** it is the
      *debugging substrate for the validation weeks themselves*. Without it he reports a bug from memory and
      Claude guesses. With it, the error and the path that produced it are both visible.
- [x] **PostHog session replay ✅ S63 (built) · ⚠️ ONE VERIFICATION OWED.** The posture is inverted as
      specified — `maskAllInputs: true` + `maskTextSelector: "*"` masks everything, then an explicit
      `data-ph-unmask` attribute unmasks an allow-listed subtree. `autocapture` is **off**, because it
      records the text of every clicked element and would route around the whole policy through a different
      door.
      ⚠️ **THE API THIS DOC ASSUMED DOES NOT EXIST.** The bullet below says *"mask everything, then
      explicitly unmask the chrome"*. **posthog-js has no unmask capability at all** — measured, not read:
      zero occurrences of `unmask` anywhere in the installed package, and no `ph-no-mask` class (only
      `ph-no-capture`, which masks *harder*). The inverted posture is reachable **only** through
      `maskTextFn`, the per-element escape hatch. A design written against a vendor API nobody checked
      against the vendor — the same finding class as this workstream's other two, one layer down.
      ⚠️ **AND THE OBVIOUS ALLOW-LIST WOULD HAVE LEAKED THE ENTIRE GROCERY LIST.** "Unmask the chrome — nav,
      buttons, state labels" reads as a selector like `nav, button`. **`grocery-row.tsx` renders the item
      name as a display `<button>`** (the `<input>` only exists while editing), so `button` would have
      recorded the largest piece of household content in the product, on the surface used most, via a rule
      that looks obviously safe. That case is a named test.
      ✅ **THE OWED VERIFICATION RAN IN S64, AND IT FOUND A LEAK — BUG-060.** *"A masking config that reads
      correctly and records the grocery list is precisely the false green this project has produced six
      distinct ways"* was right, and that is what was happening. **Text masking works — zero leaks in text
      nodes, measured.** But **rrweb records ATTRIBUTES VERBATIM** and the installed build has **no
      attribute-masking hook at all** (`posthog-js/dist/rrweb.d.ts` → `recordOptions` offers
      `maskTextClass`, `maskTextSelector`, `maskAllInputs`, `maskInputOptions`, `maskInputFn`, `maskTextFn`,
      and nothing for attributes), and no central place to scrub it either — each snapshot item is
      compressed inside the lazily-loaded recorder bundle **before `before_send` runs**. **No configuration
      could have closed it.** Leaking through ``aria-label={`Check off ${item.name}`}`` and its siblings: the
      grocery list, the week's meal titles, the recipe library, and the user's **dietary constraints**.
      ⚠️ **The bullet above predicted the door and missed the doorway.** It correctly named `grocery-row`'s
      display `<button>` as the trap — and the leak was that same button's **label**, one layer further out.
      ⚠️ **And the check itself was vacuous in two stacked ways before it could see any of this:** the `/s/`
      request carries **no `compression=` in its URL**, so the URL-keyed gunzip never fired; and even
      decompressed, the outer body is an envelope whose every large `$snapshot_data` item is gzipped **again**
      inside it — **the outer JSON has never contained one word of page content.** Fixed by sniffing magic
      bytes, expanding inner streams recursively, and two guards: one that fails if an ingest body is mostly
      unprintable, one that fails if the inner expansion stops expanding.
      **Now verified: `10 requests, 157,787 bytes inspected, 0 leaks`.**
      **Quota confirmed at build time rather than assumed** (posthog.com/pricing, fetched 2026-08-03):
      **1M events / 5,000 recordings / 100k exceptions per month, free, no card.** Two users for two weeks
      cannot approach any of it.
- [x] **Sentry ✅ S63** — production-gated by DSN presence (the same allow-list shape), `sendDefaultPii:
      false` restated explicitly because its absence looks identical to its having been considered, and
      **Sentry's own session replay is OFF**: a second recorder with its own masking defaults would ship the
      vendor default while the careful posture above governs only the other recording.
      ⚠️ **`tunnelRoute` deliberately NOT set, and this is S59 applied BEFORE it bit rather than after.** It
      creates a same-origin `/monitoring` route for error POSTs; `src/proxy.ts` gates every path not on
      `isSignedOutReachable()`, and `/monitoring` would not be on it — so reports from a **signed-out**
      browser would 307 to `/login` and vanish. Errors on the login screen are exactly the ones worth
      having, and the failure is silent: the tell is *"we get no errors from /login"*, which reads as *"none
      happen there"*. **Third time this shape has appeared in this app** (`/manifest.webmanifest` twice in
      S59, `/robots.txt` before it), and each fix was a path added to a list nobody re-reads.
      The build-time source-map upload is also conditional on `SENTRY_AUTH_TOKEN`, so neither Playwright
      suite pays for a wrapper step it has no token for.
- [ ] ~~**PostHog session replay**~~ (added S52, Griffin's call). The event taxonomy gives a named *sequence*
      (`intent_submitted` → `plan_confirmed`); Sentry gives the stack, release and user. **Neither shows what
      he actually tapped** — replay does, which is precisely the gap he named.
      **⚠️ The masking posture must INVERT the vendor default, and this is the part to get right.** PostHog
      (and FullStory, LogRocket, every tool in the category) defaults to masking *input fields* — passwords,
      card numbers, typed text — because in a typical SaaS the sensitive material is what users type. **In
      this app it is mostly rendered OUTPUT:** the chef's memories about the household, the dietary and
      health answers from the interview, household composition and children's ages, and the grocery list.
      Masking inputs by default covers almost none of that. So: **mask everything, then explicitly unmask
      the chrome and structure** (nav, buttons, state labels, error copy). A denylist fails open on exactly
      the screen we would most regret recording — the same argument that made BUG-018's guard an allow-list.
      **Do it now rather than retrofit:** with two consenting users the real risk is ~zero today, but the
      config is what carries forward, and if replay ever meets a real user on vendor defaults the leak is
      already live. Confirm the current free-tier recording quota at build time rather than assuming it.
      **Griffin's wife is recorded too** — she should be told; it costs one sentence.
- [x] **Time-to-list instrumentation ✅ S63** — `ritual_started` at intent-submit, `list_ready` when
      `generationStatus` turns `ready`, correlated by a **client-minted `ritual_id`**.
      ⚠️ **The id has to be client-minted, and that is a fact about the code rather than a preference:**
      `persistPlan` runs in the stream's `onComplete`, so **no plan exists when the clock starts.** There is
      no server-side id to correlate on.
      ⚠️ **`localStorage`, never `sessionStorage`.** The clock spans four surfaces, a confirm, a background
      projection and possibly a relaunch — iOS evicts a backgrounded PWA over a long shop, which is the
      app-kill case this project already tests for. `sessionStorage` dies with the tab and would lose the
      measurement in exactly the case most worth measuring.
      ⚠️ **`ritual_abandoned` is part of the measurement, not garnish.** Without it, "< 10 minutes" is
      computed only over rituals that *finished* — survivor bias with a number attached. The DoD deserves
      its denominator.
      Guarded against every way it could lie: a malformed record is discarded rather than trusted (a garbage
      `startedAt` poisons the average while looking like data), a backwards clock cannot produce a negative
      duration, and completing clears the ritual so a refetch or a second device cannot report it twice.
- [ ] **Security review of the full surface** + rate-limiting audit. Per the standing rule for
      auth/secrets/PII work, live-code vulnerabilities ship as their own PR first.
- [ ] **⭐ Migration safety — added S54, and it is the risk the non-prod-Supabase-project debate was standing
      in front of.** That question closed **NO** (`open-questions.md`): the suite already runs as its own
      account in its own household behind four guards, and Griffin's own proposal turned out to be what was
      already built. Interrogating it surfaced the real exposure, which has nothing to do with the test
      suite: **`drizzle-kit generate` cannot tell a rename from a drop-plus-add.** Rename a column in
      `schema/` and it emits `DROP COLUMN` + `ADD COLUMN`, silently destroying that column's data;
      `db:migrate` applies it to the project holding real data, with no automatic backup on Supabase Free.
      **One bad generated migration, silent and unrecoverable.** It has never bitten because all 11
      migrations are **purely additive** — zero `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE FROM` —
      which is a young schema, not a control. **The first genuinely destructive change is V1.5's household
      sharing**, which is why this lands in D rather than displacing Workstream B. Three parts:
      - [x] **Expand/contract written into `.claude/rules/drizzle-schema.md` as the standing discipline ✅ S62.** No
            migration both removes something and depends on its absence: add nullable → backfill → switch
            reads → drop later, as a separate migration. Rollback becomes a code deploy, not a data restore.
            ⚠️ **Already done instinctively once** — `0010` dropped a *default* and deliberately did not
            backfill, because a genuine "2 adults" answer is byte-identical to the default. The reasoning
            exists; it is not written down as a rule.
      - [x] **`migrations.test.ts` ✅ S62** — scans every `migrations/*.sql` and fails unless the file
            carries `-- ACKNOWLEDGED-DESTRUCTIVE: <reason>`. Six data-destroying patterns plus the two
            expand/contract violations that are checkable from the string (`ADD COLUMN … NOT NULL` with no
            `DEFAULT`, and `ALTER COLUMN … SET NOT NULL`). ⚠️ **Verified in all three directions**, which
            mattered: red on 7 planted offences, **silent on the two lookalikes that must not trip it** —
            `DROP POLICY IF EXISTS` (×11 in `0002_rls.sql`, idempotent re-creates) and
            `ALTER COLUMN … DROP DEFAULT` (`0010`, removes a default for future rows, touches no data) —
            green once acknowledged, green on the real 11. **Measuring the existing migrations before
            writing the patterns is what kept it from crying wolf on day one**, which is the failure that
            teaches you to edit the expectation (S59). ⚠️ It **cannot** verify a dump was taken and says so
            in its own failure text; the marker is a sentence you have to type, not a flag you can pass.
      - [x] **`pg_dump` before any acknowledged-destructive migration ✅ S62** — the command is in the rule
            file, and the guard's failure message points at it. ⚠️ **This is the part a staging
            project would NOT have given us** — rehearsing a bad migration and then applying the same bad
            migration to prod loses the data either way. The dump is the only step that helps at the moment
            it matters.
- [ ] **Performance + a11y pass** (B3's hit targets verified here)
- [ ] **Error-state sweep** — every surface has a fallback with a retry, not a blank screen
- [ ] **BUG-017 🟡** — the first-run gate is not synchronous with first paint, so a brand-new account's
      page queries can race `ensureOnboarded` and throw FORBIDDEN before the redirect lands. React Query's
      default retry papers over it incidentally. **If it shows up in the wife's real first run, it becomes
      the first thing fixed** rather than a 1F hardening item.
- [ ] **Full E2E suite green across all tabs** + the ship checklist
- [ ] **Validation prep — the wife's account (added S60).** Her own account, **full `DEV_TOOLS_EMAILS`,
      identical permissions to Griffin's, no carve-out and no sequencing.** She is a **software engineer**,
      she has **sat beside Griffin through much of this build**, and she will be **testing as aggressively
      as he does.** She is a second tester with context, and the account is a five-minute setup, not an
      event to stage. ⚠️ **See the correction below — three drafts of this section treated her as an
      outside party, and that was wrong at the source.**
- [ ] **Mention session replay to her before it records.** One sentence between spouses; noted because
      the replay item above owes it, not because it is ceremony.

---

# Workstream E — In-app feedback capture

**Added S60, reversing the S49 cut** (see the correction under *Griffin's calls at phase open*). Origin:
the S35 brain-dump and the S39 vision, both filed in `idea-backlog.md` and both tagged `[1F]` all along.

**What it is, in Griffin's shape.** He is on the couch with his phone, hits something wrong, and **one
control** opens a capture sheet. He says or types what happened. Submitting **auto-attaches everything
needed to diagnose it** — so he describes the *problem*, never the *state* — and lands it somewhere Claude
reads at the start of the next session. It must work for a **feature request** as well as a bug. The goal
is **friction-free volume**: report quality is the system's job, not the reporter's.

**Why it is R1 and not V1.5.** Because the alternative is the status quo, and the status quo is: he
notices something at 9pm, has no laptop, and either texts himself or forgets. Every bug lost that way is
lost from the *only* two weeks of real-usage data R1 will ever produce before it is declared done.

## E0 — the deep scoping pass (NOT YET RUN — this is the slot, not the spec)

**Trigger: when Workstream D's observability items land** (PostHog taxonomy + Sentry + session replay).
Not before. The metadata half of this feature is a *join* against those three, and specifying a payload
against an event taxonomy that does not exist yet produces a spec that gets rewritten. ⚠️ **But see the
open call below — the *build* may not want to wait for the *scope*.**

**What E0 must decide.** Carrying a recommendation into each so the deep pass starts from a position
rather than a blank page:

1. **The trigger affordance.** Floating control vs. shake vs. a You-tab entry. ⚠️ **Shake is the expensive
   one on iOS**: `DeviceMotionEvent.requestPermission()` is a permission prompt that only fires from a user
   gesture, so "shake to report" needs a settings toggle to arm it anyway. **Against a persistent control:**
   it occupies real estate on every surface, and Workstream B just spent nine items making those surfaces
   clean. *Lean: **reuse the HUD's corner control**, one tap, behind `DEV_TOOLS_EMAILS`.* Both R1 users
   hold that flag, so the seam costs nothing and buys back the design pass. ⚠️ **The constraint is
   V1.5-facing, not R1-facing:** build the mutation, table and payload so the surface can **graduate** to a
   real product affordance when real users arrive, rather than wedging it into the HUD in a way that has to
   be rebuilt.
2. **Media capture.** ⚠️ **Screen recording is effectively unavailable in mobile Safari** —
   `getDisplayMedia` is not supported on iOS, which kills the S39 vision's recording half outright. A
   DOM-to-canvas screenshot is possible but produces a *reconstruction*, not what he saw, and it will
   disagree with the bug on exactly the rendering bugs it is meant to capture. *Lean: no capture code at
   all. **iOS's native screenshot + a plain file input**, so he screenshots the way he already does and
   attaches it. Zero capture code, real pixels, and it handles video too because iOS screen-records
   natively.*
3. **⭐ Destination — the biggest simplification lever.** Options: a `feedback` table in Postgres that
   Claude sweeps at session start; a **Linear** ticket (this was S19's named graduation trigger); a file.
   *Lean: **the table.** Linear needs an OAuth authorization Griffin has not done, and it adds an
   integration surface, a second source of truth, and a sync question for a two-person release whose bug
   ledger is already a tracked, closeable markdown file. The "agent picks it up" queue that justified
   Linear is **already how this repo works** — Claude reads the docs at session start. Adding "read the
   feedback table" is a script, not an integration.* **The Linear trigger therefore moves to real users,
   not to this feature.**
4. **Where the LLM cleanup happens.** Server-side at submit, or by Claude at sweep time. *Lean: **sweep
   time**, because it is free. Claude already writes the `bug-tracker.md` / `idea-backlog.md` entries in
   the house format. A server-side call adds cost, latency, a failure mode and a rate limit to buy a
   tidier row in a table only Claude reads.* ⚠️ **The one argument the other way:** cleanup at submit means
   the report is legible to *Griffin* between sessions. Worth weighing at E0, not now.
5. **The auto-attached payload.** **Big head start: `readDebugPanels()` already produces most of this and
   is already on prod** (`src/lib/debug/debug-hud.ts`, shipped S17). Add: route, release/commit SHA,
   device + OS + viewport, the PostHog session id (**this is the join to replay — get it in the payload or
   the replay is unfindable**), recent tRPC calls, last Sentry error id, seeded-vs-real.
6. **Bug vs. feature request.** One door or two. Griffin's S39 note is explicit that it must carry both.
7. **✅ ANSWERED S60 — both users are engineers-with-context holding identical dev-tools permissions**, so
   this surface serves **two aggressive testers, not a stranger.** It does **not** need to be discoverable
   to someone who does not know they are testing, which is what makes question 1's cheap answer viable.
   **What remains for E0:** the *claim-type* split — separating **"this is broken"** from **"we should
   build X"** inside a single submission, since only the second is weighted by source and a `source` field
   alone cannot express it.

## E1 — the build

Provisional pending E0. Recorded so the shape is not re-derived from scratch:

- [ ] `feedback` table + tRPC mutation, rate-limited like the other write paths. **Carries `source`
      AND a claim type** (defect | product direction), per the weighting call below
- [ ] Capture sheet: text (iOS's native keyboard mic covers "dictate" for **zero code**), optional
      image attach, optional feature-area select
- [ ] Payload assembly from `readDebugPanels()` + route + build + device + PostHog session id
- [ ] Session-start sweep → **defects from either user file directly** to `bug-tracker.md`; **the wife's
      product-direction items file to a staging section** with a recommendation, for Griffin's ratification
- [ ] **No full product design pass in R1** — it rides the HUD seam both users hold. Build it to
      **graduate** when real users arrive; do not build the graduation now
- [ ] One E2E spec that submits and asserts the payload, verified failing first

## ✅ RESOLVED S60 — E1 builds ONCE, after D. No v0 pull-forward.

Claude recommended splitting a bare-bones v0 forward on the argument that *"weeks of couch testing between
now and D have no capture path."* **Griffin's counter invalidated the premise rather than outweighing it:**
*"I won't aggressively test until we have all logging etc instrumented."* If the testing volume the v0
exists to capture does not happen until D lands anyway, the v0 captures nothing and the split buys a
throwaway build. **E1 therefore builds once, fully enriched, after D's observability.**

⚠️ **Honest cost: this is net-new 1F scope** — roughly one session, on a phase that still has C's design
artifacts, all of D, and two uncompressible validation weeks in front of it.

## ✅ RESOLVED S60 — two accounts, and the two feedback streams are NOT weighted the same

**Griffin's call:** his wife gets **her own test account, separate from his, with the same permissions**,
and **her feedback is treated as *considerations* while his is treated as *dictation*.**

**What "separate account" already implies, and it is not new scope:** R1 has no household sharing (V1.5),
so separate accounts means **separate households** — her own preferences, her own chef memories, her own
plan and grocery list. The DoD already required exactly this (*"Griffin **and his wife** each run the full
weekly ritual"*), so this call confirms the existing bar rather than raising it. ⚠️ **The consequence to
expect during validation: one kitchen will be running two independent weekly plans and two grocery
lists.** That is awkward as a household but correct as a test, and it is the cleanest possible argument
for why household sharing is V1.5's headline.

**Same permissions means SAME. Full `DEV_TOOLS_EMAILS`, no carve-out.**

⚠️ **Claude pushed back on this twice and was wrong twice, on a premise it never checked.** The push-back
was: withhold dev tools, because the test-mode card can reset onboarding and because developer chrome
would contaminate "the cold-user signal." **There is no cold-user signal.** Griffin, S60: she is a
**software engineer**, she has **sat beside him for much of this build**, and she will be **testing as
aggressively as he does.** Every argument for a carve-out was downstream of an S49 sentence calling her
*"the nearest thing R1 has to a cold user, since she has been in none of these sessions"* — which was
false when written and had been repeated in three docs since.

**What the correct premise gives instead:** a second engineer testing aggressively, who will *want* the
HUD and the test-mode card, and for whom the reset affordance is a feature rather than a hazard. Her
account is a five-minute setup, not an event to stage.

**Consequence for E0 question 1: the cheap answer is alive again.** With both users holding dev tools,
the feedback control **can** ride the existing HUD seam for R1, and **E1 does not owe a full product design
pass.** ⚠️ **One constraint survives, and it is about V1.5 rather than R1:** build it so it can *graduate*
to a real surface when real users arrive — the mutation, the table and the payload should not assume a
developer-only caller — rather than wedging it into the HUD in a way that gets thrown away.

**The two streams, and how the sweep must treat them:**

**⚠️ The split is by CLAIM TYPE, not by person.** Filing everything she submits as "consideration" is
wrong once the cold-user premise is gone: she is an engineer, and **an engineer's bug report is an
engineer's bug report.** Routing a clean repro through a ratification queue is friction that buys nothing.

| Claim type | Treatment | What it means at sweep time |
|---|---|---|
| **A defect** — something is broken, wrong, or confusing | **Dictation, from either of them** | Files directly to `bug-tracker.md` in the normal format, with repro + severity. The report is already the decision |
| **A product direction** — a feature, a redesign, a "we should…" | **Griffin dictates; wife's is a consideration** | Hers files to a **staging section** with a recommendation attached, and **Griffin ratifies before it becomes work** |

**The line is product ownership, not credibility.** Griffin owns what this product is; that does not make
her diagnosis worth less, and treating it as though it did would throw away the better half of a second
engineer's testing. So the sweep separates *"this is broken"* from *"we should build X"* and weights only
the second by source. **A `source` field alone cannot express that** — the claim-type split is the E0 item.

**One prerequisite this creates, and it is not in E:** her account needs to exist on prod before the
validation weeks, with full `DEV_TOOLS_EMAILS`. Routed to Workstream D's validation prep as a five-minute
setup item.

## E exit

- [ ] E0 run and its calls recorded in `decisions.md`
- [ ] E1 built, deployed to prod, and **used at least once from Griffin's phone** before the two
      validation weeks start — a capture tool that has never captured anything is not verified

---

## Deliberately NOT in 1F

| Item | Destination | Why |
|---|---|---|
| Closed beta, invite flow, support path, onboarding-for-strangers | V1.5 | Griffin's S49 call — two-user validation is the bar. ⚠️ **`feedback capture` sat on this row until S60 and no longer does** — it was bundled here by mistake and is now **Workstream E**. The rest of the row stands |
| **BUG-023** 🟡 (`plan.modify` reports days, not slot ids) | Before multi-meal generation ships (V1.5+) | Not reachable in production: generation produces dinners only. At R1's one-dinner-per-day the client's resolution is *exactly* row-level |
| **BUG-003** 🟡 (cooked-harvest writes inside `recipe.list`) | Revisit at a scheduler, or if `recipe.list` perf degrades | Accepted for V1, documented, idempotent |
| A separate non-prod Supabase project | Griffin's call (see A5) | The cheap guard lands in 1F; the real fix may be V1.5 |
| Mid-week resync, `mergeOverrides`, bespoke Groceries empty/error states | 1D deferrals → V1.5 | Deferred by scope in 1D, unchanged |
| Any new all-states design pass | — | 1F polishes on top of the 1E.5 / 1D / 1E designs; it does not re-design a surface |

---

## Exit criteria — what closes 1F, and with it Release 1

1F is the last phase, so its exit **is** the Release 1 Definition of Done. It closes when:

- [ ] Workstreams A–E complete
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
| 2026-08-03 (S65) | **BUG-058 CLOSED, and the suite has no red left — PR #28 is unblocked.** The full run on a verified-idle machine gave **142 passed / 0 failed (19.5m)**; S64's failure was CPU contention (vitest + lint + typecheck inside the run, plus an FFOS `next dev` holding 123% CPU on a 4-core box). New **`X7`** pins the fix at a 4x CPU throttle and the S64 probe comes out of X6; **143 specs, all green, 815 unit green.** New permanent harness capability: `tests/e2e/harness/cpu-throttle.ts`. | ⚠️ **A green run is not a resolution, and that is the transferable half.** It cannot separate *the bug is gone* from *the trigger did not fire* — which is exactly what three sessions of "it passed this time" had been hiding. The dial made the A/B decidable in two minutes: **pre-fix at 4x → `value: ""`, `disabled: true`; post-fix at 4x → text intact.** ⚠️ **S63's remount was RIGHT.** It was filed off a code read, dismissed at S64 as unconfirmed, and confirmed at S65 by measurement. The three-session cost was never bad reasoning about the mechanism — it was that **nothing in the harness could make the mechanism fire**, so each session concluded from whichever way the coin landed, and S64 read its own X6 failure as proof its (correct) fix had missed. **A mechanism read off the source is a hypothesis until you can turn its TRIGGER on and off; a defect that only appears under load needs a load knob before it needs another theory.** ⚠️ Riders: **CDP CPU throttling slows the RENDERER only**, not the Next server on the same box, so it reproduces a slow phone rather than a loaded machine (a 1500ms tRPC delay produced *no* remount rather than a worse one); **an unverified dial is a no-op wearing a passing test**, so the helper fails unless a fixed busy-loop actually got slower; and **teardown must never throw**, after `cdpSession.detach` replaced the real assertion error in the report |
| 2026-08-02 (S61) | **C's three design artifacts BUILT — the icon, the launch screen and the offline clause.** Workstream C is code-complete; the only thing left in it is **Griffin's two phones**. New `scripts/generate-splash.mjs` + `src/assets/splash-devices.json` (one table, two consumers), new `apple-splash.ts` + `splash.test.ts`, new `use-offline-clause.ts` + its unit table, new `.spec-offline-clause`, new **OF5/OF6/OF7** and a new `grocery-offline-clause` capture state. **BUG-051 🟠 filed rather than fixed** (an item added offline is the S60 illusion one control over). | ⚠️ **Every real defect this session was a value transcribed by eye instead of by its definition, and the icon carried three.** A `radial-gradient(circle at …)` has an implicit `farthest-corner` extent (0.892, not the placeholder's guessed 0.72); a **box-shadow blur radius is twice the Gaussian σ**; and an outer box-shadow is **clipped to outside its border box**, so an unmasked glow shines through a `.42`-alpha rim and makes the ember a different object. None of these look wrong in a thumbnail — they were caught by **sampling the rendered pixels against the arithmetic**, which is `/visual-qa`'s own "stop judging and measure" one layer lower down. ⚠️ **And the artifact beat the reasoning that predated it**: the placeholder's toque carried a comment arguing for scaling by the ink, which produced a hat ~8% larger than the locked `227px`. A comment explaining why a number is right is not evidence that it still is. |
| 2026-08-02 (S61) | **The clause shipped as a crossfade and was corrected to a fade-swap**, and OF6 shipped too narrow to catch its own subject. | ⚠️ **Two stacked words in one grid cell is a true crossfade and puts both words in `textContent` at once** — so the header announced two contradictory states to anyone not looking at it, and every text assertion read `· offline · sending`. Neither opacity nor `visibility: hidden` helps, because `toHaveText` reads `textContent`. **At four characters of caption type a fade-swap and a crossfade look identical; announcing two contradictory states does not.** ⚠️ **The sharper one: OF6, whose entire subject is *no per-row anything*, could not see a per-row badge** — it measured the checkbox's own computed style, and a sibling element changes nothing about that. OF5 caught it; OF6 did not. *Ask what the layer cannot see* — **including a layer written this session**, which is S54's clause with the ink still wet. Widened to the row's text and box, then re-verified against an offline-**conditional** badge, because the first planted defect was unconditional and therefore appeared in both measurements — **a force-failure that does not reproduce the real defect proves nothing.** |
| 2026-08-01 (S60) | **E's two open calls resolved, and an S49 factual error corrected across three docs.** (1) **E1 builds once, after D** — no v0 pull-forward. (2) **Griffin's wife gets her own account with FULL `DEV_TOOLS_EMAILS`, identical to his**, and the feedback weighting splits **by claim type, not by person**: a defect is dictation from either of them, only *product direction* is weighted by source. E1 consequently gets **cheaper** — it rides the HUD seam and owes no R1 design pass. Workstream D picks up one five-minute item (her account before validation). | **Claude pushed back on the permissions twice and was wrong twice, on a premise it never checked** — it argued for withholding her dev tools to protect *"the cold-user signal."* There is no cold-user signal: she is a **software engineer who has sat beside Griffin for much of this build** and will test as aggressively as he does. ⚠️ **The premise traces to one S49 sentence** — *"the nearest thing R1 has to a cold user, since she has been in none of these sessions"* — **repeated verbatim into three docs, where it went silently load-bearing under three separate recommendations** (withhold dev tools, stage her account creation as an observed one-time event, weight her feedback below his). All three collapsed the instant it was stated to the one person who could check it. **This is the session's second instance of the same failure mode** (see the row below: a decision's fallout list repeated unexamined), and the tell here is sharper and worth keeping: **a claim about a *person*, written in a doc, that the person has never seen.** Also: the v0 pull-forward recommendation was **sound on its logic and wrong on a fact only Griffin held** — that he would not test aggressively before the instrumentation lands |
| 2026-08-01 (S60) | **⭐ NEW Workstream E — in-app feedback capture, reversing the S49 cut** (Griffin: *"I didn't mean to cut the in-app feedback"*). Structured as **E0 a deep scoping pass** (triggered when D's observability lands, seven named decisions each carrying a recommendation) + **E1 the build**, with an open call left in the doc for Griffin on whether a bare-bones v0 pulls forward. Exit requires it be **used once from his phone before the validation weeks**. The S49 fallout bullet, the *Deliberately NOT* row, and the A–D exit line all corrected in place rather than rewritten, and the same correction pushed to `scope-v1.md` + `decisions.md`. | **The cut was a bundling error, and naming it as one is the transferable part.** Every other item on S49's fallout list is justified by *there are no strangers in R1* — invite flow, support path, onboarding-for-cold-users. **Feedback capture is not: its primary user is Griffin, on his couch, with a phone and no laptop**, and that justification is untouched by "no closed beta." It died because it arrived in the same sentence as the support path. ⚠️ **A decision's fallout list is where unrelated scope goes to disappear** — the list was written once, ratified once, and then three separate docs repeated it verbatim for eleven sessions, so by S60 the cut looked like a considered call in triplicate rather than one unexamined bullet. **The check that would have caught it: does every item on this list fail for the *same reason* the decision gives?** Two more findings from the scoping: **`getDisplayMedia` is unsupported on iOS**, so the S39 vision's screen-recording half is not buildable in mobile Safari at all and the native screenshot + file input is both cheaper *and* the only thing that works; and **the rich tier was S19's named Linear graduation trigger, which now does not fire** — a Postgres table Claude sweeps at session start is the same queue without the integration, so Linear's trigger moves to real users |
| 2026-08-01 (S60) | **Workstream C's whole non-visual half shipped** — service worker + app-shell cache, React Query → IndexedDB persistence, and the queued offline check-off. **Only the four design artifacts remain in C.** The `/visual-qa` pass S59 owed ran at **0 blockers / 0 high** and closed **BUG-050**; **BUG-051** was found and closed by the offline specs. New **OF** spec family (OF1–OF4) and a new capture state. **739 unit green**, lint + typecheck clean. | ⛔ **A service worker does not control the page that registers it** — that navigation is already in flight when `register()` runs, so the **first visit to a route never reaches the fetch handler and never gets cached**, and the worker then activates reporting itself healthy holding **nothing**. Invisible in a browser tab (tomorrow's visit caches it); in an **installed PWA it is the whole feature failing on the launch that matters most** — install, open once, walk to the shop, dead page. **Caught by running the specs, not by reading the code.** ⚠️ **The queued check-off's "smaller half" is an ILLUSION, not a lesser feature:** persisting the query cache without the mutations persists `onMutate`'s optimistic tick, so ticks survive a relaunch and are then **wiped by the first server refetch** — the user watched their work survive and concluded it was saved. React Query persists paused mutations **by default**, so doing nothing was never neutral. ⚠️ **A guard can be one-directional and look complete:** `caps-rungs.test.ts` sees labels routed *through* a rung but not something routed *to* a caps rung that should not uppercase — which is how `COOKED JUL 29` shipped beside `Cooked Jul 23` through 717 unit, 132 E2E and a full `/visual-qa`. |
| 2026-08-01 (S59) | **Workstream C opened; the manifest, the icon pipeline and BUG-049 landed.** ⭐ **Gate 1 (`SITE_ACCESS_CODE`) RETIRED on Griffin's call** — env only, no code diff. **Queued check-off ADDED to C's scope**, widening "offline read" on Griffin's call. **BUG-049 CLOSED** at six sites, not the five filed. The design pass is **taken** (targeted, five artifacts) and its brief is written at `docs/design/surfaces/pwa/brief.md`. Recipes' and Groceries' titles moved off the chef's 26px rung onto §05's H1, **pending Griffin's look on a phone**. `PROJECT-CONTEXT.md` and `visual-qa-rubric.md` de-staled. **714 unit green**, lint + typecheck + build clean. | ⚠️ **The gate did not degrade the PWA, it made the PWA a dead icon — and nothing in C's filed list mentioned auth.** Gate 1 was a **cookie**, and a PWA's cookie jar is isolated from Safari's, so a freshly installed app opened at `start_url` with an empty jar and got the deliberately-blank 404 **with no address bar to escape it.** Underneath it, `/manifest.webmanifest` was not excluded by the proxy matcher and **a browser fetches a manifest with `credentials: "omit"`** — so it 404'd from a session that held the cookie, and **a failed manifest fetch is silent**: Add to Home Screen just makes a bookmark with Safari chrome. C's own "launches full-screen" line would have failed on production with nothing in any log. ⚠️ **Two more of the phase's own lessons fired.** BUG-049's filed fix (*"copy `ui/input.tsx`'s string to all five"*) was the thing to distrust for the **sixth session running** — copying a private string is how the bug happened, so the floor was NAMED instead; and the filed list was five because the S58 measurement hunted **arbitrary-value** sizes, missing the one input written `text-sm`. **A filed list inherits the blind spot of the measurement that produced it.** And the ratchet B8b shipped to stop the ladder growing back was set at **71 while measuring 26** — forty-five notches of slack, a ratchet that could not ratchet. |
| 2026-08-01 (S58) | **B8b CLOSED — Workstream B is 9 of 9 and the design-system pass is DONE.** Re-measuring first found the S57 filing already stale (22/53/29 → 27/51/28 in one session, moved by B8a's own edits) and then found the actual shape: **six of §05's ten rungs had no class at all**, which is why 192 of 255 type sites were off a 30-size ladder. All six added, **169 sites routed**, adoption 218 rung call sites vs 71 hand-typed. Two things the sweep could not have found by size: **the chef's voice was drawn at three sizes while eight non-chef sites sat on its rung**, and **`0.9rem` = 14.4px rounds onto that rung** — so the filing's "the rem sites need no judgement" would have put five ordinary labels into gold italic. The four `caps-rungs.test.ts` allow-listed sites all closed and the **allow-list is deleted, not emptied**. New `type-scale.test.ts` (4 assertions), verified failing against pre-fix code. **BUG-049 🟠 filed** (five inputs under 16px zoom the iOS viewport). **705 unit green, lint + typecheck clean.** | ⚠️ **The lesson is the companion to B8a's, and it is new: a fix can be APPLIED correctly and still be overridden by what was already there.** The rungs live in `@layer components` so the call site can own colour — which means every leftover `font-bold` / `leading-tight` / `tracking-tight` beside the class still wins. The first pass left **81 lines where the rung was present, correct, and doing nothing.** No layer could see it: the screenshot shows type that looks like type, the DOM shows the class genuinely on the element, and `SH5` measures colour. Only reading the class string finds it. B8a learned that a layer aimed correctly can lack the precision to answer; this adds that a change can land and be silently outranked by the code it was applied to. Also: **§08 governs controls and §05 does not**, so 84 sites were deliberately left — and the controls' own 13-size scatter is now the obvious next item rather than a silent omission. |
| 2026-07-31 (S55) | **B6 CLOSED; Workstream B at 7 of 9.** Three of the S48 critic's four findings built, the fourth **moved to B8** (Griffin's call) — the caps-label item measured at ~46 sites across eight tracking values against a spec stating exactly two rungs, making it the caps half of B8's type scale rather than a tracking tweak. **BUG-046 CLOSED.** **Griffin's vocabulary call: Recipes' words win** (`Everything`/`Cooked before` → `All`/`Cooked`). **The Recipes filter chip came off the primary rung** with the `+`. New `L18`, verified failing against pre-fix code by physical backup + full rebuild. `Favorites` as a picker door deliberately NOT built → V1.5. **Two stale rubric/PROJECT-CONTEXT exemptions flipped to reportable.** | **The critic named one object where §08 states a rule.** *"One filled cream button per viewport"* — and that viewport had **two**, because the selected filter chip was `bg-primary`, a filled cream button standing in for a filter state, so softening only the `+` would have handed the primary rung to a filter. ⚠️ **`visual-qa-rubric.md` law 06 has carried that exact sentence since S42 and `/visual-qa` cleared this surface at 0/0 in S52, S53 AND S54 with both objects on screen.** Sixth instance of *ask what the layer cannot see* and a **new shape**: the check was not missing (S47), not stale (S52), not seed-blinded (S53) — it was **present, correct, and unrun**. Two more: the vocabulary rename turned **nothing** red because both surfaces' tests hand-fed or bypassed the copy, and piping the suite through `tail` reported **exit 0 while the summary said "1 failed"** — a false green mirroring S54's false red |
| 2026-07-31 (S54) | **B2 + B3 + B4 CLOSED as one batch; Workstream B at 6 of 9.** New `tests/e2e/specs/shell.spec.ts` (SH1/SH2/SH3), each verified failing against pre-fix code. **BUG-042 CLOSED as won't-do** on Griffin's call and moved to the tracker's Resolved log, so the retracted instruction cannot be re-derived from an open row. **Two new type levels added** (`.spec-group-title`, `.spec-row-title`) — they did not exist, which is why subsections were built at random weights. Bundled deliberately, per S52's B1+B5 precedent: three five-surface capture passes for a 4px corner, a padding sweep and an `<h2>` promotion would be ceremony rather than discipline. | **The sweep written to BE B3's audit was blind to two thirds of its subject.** It found 2 undersized controls; a source-side cross-check found 4 more inside a dialog it never opens — and then the real finding: `ui/button.tsx`'s icon variants are 24/28/32/36px, so **every rung of the shared primitive was under the 44px floor** and the next `size="icon"` was wrong by default. Fourth instance of *ask what the layer cannot see*, and the first where the blind spot was in apparatus written that same session. **B4 ran the lesson in the other direction:** the item was *smaller* than filed (type half = 2 sites, not a sweep), and 4 promotion candidates had to be excluded — 2 kickers above an `<h1>`, 2 labels inside a `<button>` — where a pattern-matched sweep would have broken all four |
| 2026-07-31 (S53) | **B9 CLOSED** (BUG-037 + BUG-038); Workstream B at 3 of 9. **BUG-046 🟡 opened** (the recipe detail body wears cream, the action hue, on three non-pressable elements — B1's finding one surface over) and routed to B6/B8. **BUG-042's toggle RETRACTED, not deferred** — disabling the Supabase Email provider would red all 123 specs, because the harness's only sign-in is `signInWithPassword`; it bundles into the non-prod Supabase project decision, collapsing Griffin's two owed items into one. | The filed bugs were the smaller half. `seed.ts` hard-coded `ingredients: []` / `steps: []` for every recipe, so BUG-038 was **100% of seeded recipes** and the tab's only detail capture had **never once shown a populated recipe body** — the gate was grading the degenerate state as canonical, and fixing the bug alone would have made it blinder. A second, older blindness came with it: the capture *waited out* BUG-037 rather than photographing it. Third instance of *ask what the layer cannot see*, and the first where the state existed but was silently the wrong one |
| 2026-07-31 (S52) | **B1 + B5 CLOSED** (`/visual-qa` 0 blockers / 0 high). **Order B → C → D reaffirmed and its rationale rewritten** after Claude proposed pulling D forward and Griffin overruled it. **PostHog session replay added to D**, with a masking posture that inverts the vendor default. **A design pass is now RECOMMENDED for C** (reversing the blanket "skip" that still applies to B). **BUG-045 opened.** | Two of Griffin's arguments beat Claude's: validate the artifact you actually ship (the PWA is how he will use it, so a browser-tab validation spends the two uncompressible weeks on the wrong configuration), and observability is the *debugging substrate for the validation weeks*, not just the source of the DoD metric. C also turned out to carry genuinely new design surface — icon, splash, install prompt, offline state — which exists in no spec, unlike B's already-designed screens |
| 2026-07-30 (S51) | **Workstream A CLOSED at 6 of 6.** A4 (BUG-013), A5 (BUG-042 measured + BUG-043 confirmed), A6 (BUG-018). **BUG-044 🟡 opened** (interviewStateSchema's `dietaryFramework` is a bounded string where the persist path enforces an enum) and routed to Workstream D's security review. The separate non-prod Supabase project moved out of this doc into `open-questions.md` as a decision with a recommendation (V1.5), since it is a call rather than a defect. | Two of the three items had a tracker recommendation that was wrong in a way only building it surfaced — BUG-013's recompute would have doubled the injection, BUG-018's named guard would have failed open. Recording that in the scope doc, not just the changelog, because it is the second phase running where the parked recommendation was the thing to distrust |
| 2026-07-30 (S49) | **1F opened → 🔨.** Scope drafted from the carried-in list: BUG-035 first (the only *before R1 ship* item on the app's most important call), the standing bug list, spec §12 items 03/04/05/07, the S42 amber/green semantic calls, the S48 critic slate's four deferrals, PWA, and production readiness. Split into four independent workstreams (ship-blockers / design system / PWA / production readiness) with A→B→C→D recommended. | 1E.5 closed at M5.5 and 1F is the last phase of R1. Splitting by workstream rather than by surface keeps the per-surface `/visual-qa` discipline intact — the same argument that split 1E.7 out of 1F in the first place |
| 2026-07-30 (S49) | **A5 added after first draft: BUG-042 + BUG-043**, which arrived on `main` with the access-gate work that merged alongside 1E.5's close. Neither is a code defect — BUG-042 is a Supabase dashboard toggle (dormant while the gates stay unset, but do it anyway), BUG-043 is correct to leave in place through all of R1 and graduates to a launch-day checklist instead of being fixed here. The closed-beta section was corrected in the same pass: the gate it assumed would need building **already exists on `main`** (PR #6). | The doc was drafted against a tree that did not yet carry the access gate. Scoping a phase against a stale picture of `main` is how an item gets built twice or missed entirely |
| 2026-07-30 (S49) | **scope-v1 open question #1 RESOLVED: no closed beta.** Two-user validation (Griffin + wife, 2 consecutive real weeks) is enough to ship R1. Removes the invite gate, feedback capture, support path, and onboarding-for-strangers pass from this phase. `ALLOWED_EMAILS` stays fail-open as the V1.5 seam. | Parked *for* 1E and carried through three phase closes; it gated 1F's shape and could not be deferred again without opening the phase blind. ⚠️ **AMENDED S60 on two counts.** Feedback capture should never have been on the removal list (bundling error → now Workstream E), and this cell's original claim that *"the wife's first run is the nearest thing R1 has to a cold user"* is **factually false** — she is a software engineer who has sat beside Griffin through much of this build and will test as hard as he does. **R1 has no cold user**, and that false premise went on to hold up three separate recommendations before anyone checked it |

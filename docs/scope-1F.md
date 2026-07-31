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

### B8 — Type scale, motion, and component-library consolidation

The remaining design-system work the spec calls for beyond §12's enumerated items.

- [ ] **The caps-label rungs (moved here from B6, Griffin's call S55).** ~46 sites on eight tracking values
      against the spec's two named rungs — **Section eyebrow** (11px / 600 / 2px / `#A79A8C`, names a shelf
      of content) and **Label** (10.5px / 700 / 1.3px / `#A29484`, names a field or a slot inside a card).
      ⚠️ **Add them as classes first, then route** — B4 added `.spec-group-title` / `.spec-row-title` and
      stopped, and B3's finding was that an unnamed rung means the next call site is wrong by default. The
      per-site work is a **classification**, not a find-and-replace: the two rungs differ in size, weight and
      colour as well as tracking, and which rung a label belongs to is a question about what it names.
- [ ] **BUG-045 🟡** — the last `#FF9F0A`, the quick-add dedupe notice. ⚠️ `palette.test.ts` allow-lists that
      exact line, so **closing it reds the test until the exception is deleted too**.
- [ ] **BUG-048 🟡 (new, S56)** — the constraint chip's remove `×` at 20×20, the last hit-target violation in
      the app and the one `SH2` is allowed to find. It sits here rather than in B3 because the fix is **chip
      geometry**, not one button: the chip is 36px tall, so a 44px target inside it changes every chip on the
      You tab. ⚠️ Its exemption is carried by the element (`data-hit-target-exempt="BUG-048"`) and `SH2`
      fails if an exempt control is **not** undersized, so **closing it reds the suite until the attribute is
      deleted too** — the same shape as BUG-045's allow-listed line in `palette.test.ts`.
- [ ] **A `bg-primary` audit is likely owed here.** 32 call sites carry it today, spanning genuine primaries,
      list markers and badges. §08 allows one filled cream button per viewport; nothing enforces it, and S55
      found two on the Recipes library that three `/visual-qa` passes had cleared. ⚠️ **S56 adds a second
      reason and a starting point:** the You tab's `Talk to the chef` launcher is a filled `bg-primary`
      button wearing a **mic glyph** that opens a field, and the Groceries chef launcher is `bg-primary/15`
      — so the audit is about what the hue *claims*, not only how many of them there are.

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

**🎨 Design pass: RECOMMENDED for this workstream — and this is a reversal of the "skip it" call that
applies to B.** B applies a locked spec to screens that are already designed, so a design round would only
re-litigate settled decisions. **C is net-new surface that exists in no spec and no mock:** the app icon,
the splash/launch screen, the install prompt, and the offline grocery-list state. It is also the surface
Griffin sees every time he opens the app from his home screen, and he has said explicitly that he wants it
to look and feel finished so his validation-week feedback can be about design rather than about gaps.

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
      ⚠️ **And, per Griffin (S52), that is the smaller half of why it comes before validation:** it is the
      *debugging substrate for the validation weeks themselves*. Without it he reports a bug from memory and
      Claude guesses. With it, the error and the path that produced it are both visible.
- [ ] **PostHog session replay** (added S52, Griffin's call). The event taxonomy gives a named *sequence*
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
- [ ] **Time-to-list instrumentation specifically** — the DoD says *"< 10 minutes on a real week"*, and
      that is a measurement, not a feeling. It needs an event at intent-submit and an event at
      list-ready, shipped **before** the validation weeks start or the weeks do not count.
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
      - [ ] **Expand/contract written into `.claude/rules/drizzle-schema.md` as the standing discipline.** No
            migration both removes something and depends on its absence: add nullable → backfill → switch
            reads → drop later, as a separate migration. Rollback becomes a code deploy, not a data restore.
            ⚠️ **Already done instinctively once** — `0010` dropped a *default* and deliberately did not
            backfill, because a genuine "2 adults" answer is byte-identical to the default. The reasoning
            exists; it is not written down as a rule.
      - [ ] **`migrations.test.ts`** — scan `src/server/db/migrations/*.sql` for destructive statements and
            fail unless the file carries an explicit acknowledgement comment. This repo's established idiom
            (`config.test.ts` scrapes `maxDuration` from route source; `palette.test.ts` scrapes hexes with an
            allow-list; `globals.test.ts` fails on hand-written vendor prefixes). Turns "we remembered to read
            the SQL" into "the gauntlet will not let it through."
      - [ ] **`pg_dump` before any acknowledged-destructive migration.** ⚠️ **This is the part a staging
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
| 2026-07-31 (S55) | **B6 CLOSED; Workstream B at 7 of 9.** Three of the S48 critic's four findings built, the fourth **moved to B8** (Griffin's call) — the caps-label item measured at ~46 sites across eight tracking values against a spec stating exactly two rungs, making it the caps half of B8's type scale rather than a tracking tweak. **BUG-046 CLOSED.** **Griffin's vocabulary call: Recipes' words win** (`Everything`/`Cooked before` → `All`/`Cooked`). **The Recipes filter chip came off the primary rung** with the `+`. New `L18`, verified failing against pre-fix code by physical backup + full rebuild. `Favorites` as a picker door deliberately NOT built → V1.5. **Two stale rubric/PROJECT-CONTEXT exemptions flipped to reportable.** | **The critic named one object where §08 states a rule.** *"One filled cream button per viewport"* — and that viewport had **two**, because the selected filter chip was `bg-primary`, a filled cream button standing in for a filter state, so softening only the `+` would have handed the primary rung to a filter. ⚠️ **`visual-qa-rubric.md` law 06 has carried that exact sentence since S42 and `/visual-qa` cleared this surface at 0/0 in S52, S53 AND S54 with both objects on screen.** Sixth instance of *ask what the layer cannot see* and a **new shape**: the check was not missing (S47), not stale (S52), not seed-blinded (S53) — it was **present, correct, and unrun**. Two more: the vocabulary rename turned **nothing** red because both surfaces' tests hand-fed or bypassed the copy, and piping the suite through `tail` reported **exit 0 while the summary said "1 failed"** — a false green mirroring S54's false red |
| 2026-07-31 (S54) | **B2 + B3 + B4 CLOSED as one batch; Workstream B at 6 of 9.** New `tests/e2e/specs/shell.spec.ts` (SH1/SH2/SH3), each verified failing against pre-fix code. **BUG-042 CLOSED as won't-do** on Griffin's call and moved to the tracker's Resolved log, so the retracted instruction cannot be re-derived from an open row. **Two new type levels added** (`.spec-group-title`, `.spec-row-title`) — they did not exist, which is why subsections were built at random weights. Bundled deliberately, per S52's B1+B5 precedent: three five-surface capture passes for a 4px corner, a padding sweep and an `<h2>` promotion would be ceremony rather than discipline. | **The sweep written to BE B3's audit was blind to two thirds of its subject.** It found 2 undersized controls; a source-side cross-check found 4 more inside a dialog it never opens — and then the real finding: `ui/button.tsx`'s icon variants are 24/28/32/36px, so **every rung of the shared primitive was under the 44px floor** and the next `size="icon"` was wrong by default. Fourth instance of *ask what the layer cannot see*, and the first where the blind spot was in apparatus written that same session. **B4 ran the lesson in the other direction:** the item was *smaller* than filed (type half = 2 sites, not a sweep), and 4 promotion candidates had to be excluded — 2 kickers above an `<h1>`, 2 labels inside a `<button>` — where a pattern-matched sweep would have broken all four |
| 2026-07-31 (S53) | **B9 CLOSED** (BUG-037 + BUG-038); Workstream B at 3 of 9. **BUG-046 🟡 opened** (the recipe detail body wears cream, the action hue, on three non-pressable elements — B1's finding one surface over) and routed to B6/B8. **BUG-042's toggle RETRACTED, not deferred** — disabling the Supabase Email provider would red all 123 specs, because the harness's only sign-in is `signInWithPassword`; it bundles into the non-prod Supabase project decision, collapsing Griffin's two owed items into one. | The filed bugs were the smaller half. `seed.ts` hard-coded `ingredients: []` / `steps: []` for every recipe, so BUG-038 was **100% of seeded recipes** and the tab's only detail capture had **never once shown a populated recipe body** — the gate was grading the degenerate state as canonical, and fixing the bug alone would have made it blinder. A second, older blindness came with it: the capture *waited out* BUG-037 rather than photographing it. Third instance of *ask what the layer cannot see*, and the first where the state existed but was silently the wrong one |
| 2026-07-31 (S52) | **B1 + B5 CLOSED** (`/visual-qa` 0 blockers / 0 high). **Order B → C → D reaffirmed and its rationale rewritten** after Claude proposed pulling D forward and Griffin overruled it. **PostHog session replay added to D**, with a masking posture that inverts the vendor default. **A design pass is now RECOMMENDED for C** (reversing the blanket "skip" that still applies to B). **BUG-045 opened.** | Two of Griffin's arguments beat Claude's: validate the artifact you actually ship (the PWA is how he will use it, so a browser-tab validation spends the two uncompressible weeks on the wrong configuration), and observability is the *debugging substrate for the validation weeks*, not just the source of the DoD metric. C also turned out to carry genuinely new design surface — icon, splash, install prompt, offline state — which exists in no spec, unlike B's already-designed screens |
| 2026-07-30 (S51) | **Workstream A CLOSED at 6 of 6.** A4 (BUG-013), A5 (BUG-042 measured + BUG-043 confirmed), A6 (BUG-018). **BUG-044 🟡 opened** (interviewStateSchema's `dietaryFramework` is a bounded string where the persist path enforces an enum) and routed to Workstream D's security review. The separate non-prod Supabase project moved out of this doc into `open-questions.md` as a decision with a recommendation (V1.5), since it is a call rather than a defect. | Two of the three items had a tracker recommendation that was wrong in a way only building it surfaced — BUG-013's recompute would have doubled the injection, BUG-018's named guard would have failed open. Recording that in the scope doc, not just the changelog, because it is the second phase running where the parked recommendation was the thing to distrust |
| 2026-07-30 (S49) | **1F opened → 🔨.** Scope drafted from the carried-in list: BUG-035 first (the only *before R1 ship* item on the app's most important call), the standing bug list, spec §12 items 03/04/05/07, the S42 amber/green semantic calls, the S48 critic slate's four deferrals, PWA, and production readiness. Split into four independent workstreams (ship-blockers / design system / PWA / production readiness) with A→B→C→D recommended. | 1E.5 closed at M5.5 and 1F is the last phase of R1. Splitting by workstream rather than by surface keeps the per-surface `/visual-qa` discipline intact — the same argument that split 1E.7 out of 1F in the first place |
| 2026-07-30 (S49) | **A5 added after first draft: BUG-042 + BUG-043**, which arrived on `main` with the access-gate work that merged alongside 1E.5's close. Neither is a code defect — BUG-042 is a Supabase dashboard toggle (dormant while the gates stay unset, but do it anyway), BUG-043 is correct to leave in place through all of R1 and graduates to a launch-day checklist instead of being fixed here. The closed-beta section was corrected in the same pass: the gate it assumed would need building **already exists on `main`** (PR #6). | The doc was drafted against a tree that did not yet carry the access gate. Scoping a phase against a stale picture of `main` is how an item gets built twice or missed entirely |
| 2026-07-30 (S49) | **scope-v1 open question #1 RESOLVED: no closed beta.** Two-user validation (Griffin + wife, 2 consecutive real weeks) is enough to ship R1. Removes the invite gate, feedback capture, support path, and onboarding-for-strangers pass from this phase. `ALLOWED_EMAILS` stays fail-open as the V1.5 seam. | Parked *for* 1E and carried through three phase closes; it gated 1F's shape and could not be deferred again without opening the phase blind. The wife's first run is the nearest thing R1 has to a cold user, and it is already in the DoD |

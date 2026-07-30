# Changelog - Meal Management App

Session-by-session log of decisions, progress, and key discussions.

---

## Session 44b — 2026-07-30 (The reversal: Instacart's door is shut. Ordering back to V2. TAM research. No code.)

**What happened:** Griffin went to create the Instacart developer account that S44's decision depended
on, and couldn't. Verified: *"We are currently not accepting new applications"* + *"There is no
waitlist available at this time."* No reopen date. **The self-serve dashboard language I had quoted
describes the flow after approval, not the gate in front of it.** The 30-40 day clock that justified
pulling ordering into R1 does not exist, so the decision collapsed within the hour.

**"Is there another way in?" — no, and we're not looking.** The API key is the only auth and keys issue
on approval. Checked and rejected every adjacent door: **impact.com affiliate** (open + free, but
tracked links and 3% commission, not programmatic list creation), **Tastemakers buttons** and
**Chicory** (open, free, self-serve — but both parse recipe markup on *public web pages*, wrong shape
for personalised lists behind auth), **Northfork / SideChef** (enterprise B2B selling to retailers, a
longer path than the application itself). Scraping or undocumented endpoints would breach the terms we
need to be clean on when applications reopen and forfeit the commission. The workaround costs more
than the wait.

**Griffin's reframe, which was the more valuable half of this exchange.** He redirected off his own
convenience: *"we shouldn't purely be building this around me. We should be focused on TAM: what is the
national integration that's going to get the most bang for my buck and have the largest addressable
market?"* Then made the call: *"let's move it to v2 anyway because it's not a critical need. I'd love
to get a polished version of v1 first."*

**TAM research (full tables in `technical-research.md`).** US grocery share 2026: Walmart 23.6%,
Kroger ~10%, Costco 9.2%, Albertsons 6.4%, Publix 4.1% — top five ≈ 53%. **Exactly one is reachable.**
Walmart no longer issues new affiliate API keys (its ATC/OPD endpoints need an Impact Radius partner
setup, and Delegated Access key creation retires 2026-07-30); Costco, Albertsons, Publix, Target and
Ahold have no public cart API. **Kroger is not the best open grocery API in the US — it is the only
one.**

**The structural insight, worth more than the decision:** *aggregators are the TAM, retailers are not.*
One Instacart integration reaches ~98% of US households across 1,800+ banners and ~100,000 stores.
Every retailer-direct integration is a separate build, separate auth, separate failure surface, for
single-digit share. **That asymmetry is exactly why the aggregator door is gated and the retailer doors
are not** — it is the shape of the market, not an obstacle to route around. Logged an explicit
**anti-idea** in the backlog ("integrate retailers one at a time") so it doesn't get re-proposed.

**Settled:** R1 ships **no** ordering integration (1D clipboard export is the answer, 1F item removed).
Instacart stays the target on a **standing watch** — no waitlist exists, so it's a manual periodic
check. Kroger is a **hedge, not a strategy**, built only if ordering turns urgent first. Pricing should
**not** be gated on ordering, since that would make the product hostage to a third party's application
queue.

**Two side findings:** Griffin shops **Haggen** (Albertsons banner, no API) and offered to switch to
**QFC** (Kroger banner) for testing, which aligns his household with the only open API. And a factual
correction to a premise he raised — the **Kroger–Albertsons merger was blocked and terminated in
December 2024**, the Haggen divestiture to C&S died with it, so Haggen stayed with Albertsons. Kroger's
actual 2026 move was acquiring **Giant Eagle** ($1.65B, 2026-07-01, ~197 supermarkets).

**Process note, logged in `decisions.md`:** this was the second miss on the same dependency in one
session. The March lesson was "re-verify before it drives a plan." The sharper version: **verify the
gate you have to walk through, not the room behind it.** Confirm a human can complete signup *today*
before a third-party dependency earns a line in a scope doc.

**Docs touched:** `technical-research.md` (access-reality table + TAM analysis + revised path),
`decisions.md` (superseding entry; the reversed one kept as a worked example), `scope-v1.md` (1F item
struck, out-of-scope rows rewritten, change log), `open-questions.md` (feasibility, account-linking,
monetization all re-cut), `idea-backlog.md` (rows re-slotted + anti-idea + DoorDash/UberEats thread),
`roadmap.md`, `whats-next.md` (clock section → standing watch). **No code changed.**

---

## Session 44 — 2026-07-30 (Grocery integration re-verified; Instacart pulled into R1. No code.)

> **⚠️ Superseded within the hour by Session 44b above.** Kept: the reasoning was sound, the
> conclusion wrong, and the failure mode is the useful part.

**The job:** Griffin asked where we landed on grocery integration, whether Instacart was the
broad-first play, and whether any of these are open APIs or need business development. A recall
question that turned into a reversal.

**What we had recorded.** `technical-research.md` (2026-03-28): Instacart is "NOT a public API —
requires business development partnership," access reserved for apps with tens of thousands of MAU;
therefore **Kroger first** (V2), Instacart at **V3+** once we had traction data to pitch with. Griffin
remembered it the other way round, as Instacart-first-for-breadth.

**What re-verification found (2026-07-30).** The recorded finding is wrong. Instacart runs a **public
Developer Platform** — self-serve dashboard, published docs, dev keys, and an MCP server. There is no
partnership to negotiate. Production access is a **compliance review** (spec-correct requests, error
handling on every endpoint, terms compliance, help-desk account), **~30-40 days**, **no documented
traffic or business minimum**. Approval carries an **impact.com affiliate invitation** — we earn
commission on attributed orders rather than paying for access. Kroger's public Cart API is still live
and still self-serve.

**The decision (Griffin ratified): Instacart first, into R1. Kroger deferred to V2, conditionally.**
Instacart wins on the merits even setting the availability correction aside — its shopping-list-page
call needs **no OAuth, no account linking, and no cart state** and reaches a North America retailer
network, where Kroger's Cart API needs all three to reach **two** Seattle banners (Fred Meyer, QFC).
Kroger also re-opens the account-linking question parked since April, which is now an argument against
it rather than a neutral cost.

**One pushback registered and kept.** Griffin called the integration "a pretty foundational component."
It isn't — architecturally it is a **leaf**: one server-side call that takes the grocery list we already
hold and returns a URL, touching no schema, auth, or state. **What justified moving early was not
coupling, it was the clock.** The 30-40 day review is calendar time nothing can compress, so the
*paperwork* got pulled forward while the *scope* stayed a single 1F checklist item. That distinction is
the whole shape of the decision.

**Slotted:** approval clock starts during **1E.5** (parallel), "Send to Instacart" ships as a **1F**
item, must degrade to the existing clipboard export on failure or non-approval. **Griffin-owned and
blocking:** the developer account, terms acceptance, and use-case statement — the clock does not start
until he does those.

**Second-order effects logged, not just the decision:**
- The **account-linking** open question (April) is now **moot for R1** and re-opens only if we build Kroger.
- The **monetization** question ("is ordering a hard requirement to justify a price?") gets cheaper to
  answer: we will hold the integration *before* pricing is set, making it observable on real weeks
  rather than a bet. It also adds a revenue line independent of subscription price.
- **Instacart's MCP server** filed to the backlog as a later idea (the chef building the page itself),
  explicitly not for 1F.

**Process lesson, logged deliberately in `decisions.md`:** a four-month-old third-party
API-availability finding was allowed to drive release sequencing without re-verification.
**Re-verify external API availability before it drives a plan, not after.** The superseded March
research is preserved in `technical-research.md` under a SUPERSEDED heading rather than deleted, so the
reversal stays legible.

**Docs touched:** `technical-research.md` (rewritten + dated correction + superseded section),
`decisions.md` (new entry), `scope-v1.md` (1F item, out-of-scope table split, change log),
`open-questions.md` (Instacart feasibility resolved; account-linking narrowed; monetization updated),
`idea-backlog.md` (V2 rows re-slotted, MCP idea added), `roadmap.md` (V2 core features), `whats-next.md`
(parallel clock section at the top). **No code changed.**

---

## Session 43a — 2026-07-28 (Closed-beta access gate — unplanned, Griffin-initiated)

**The job:** Griffin noticed `meal-app-swart.vercel.app/you` loaded for him and asked whether it was
publicly reachable. It was — the domain, not the data. Answering it turned into shipping the closed-beta
gate that `scope-v1.md` had been carrying as an open question for several sessions.

**What the audit actually found.** The data was never exposed: `/you` unauthenticated returns
`307 → /login` (verified live), behind four independent layers — the proxy's cookie check, the `(app)`
layout's server-side `getClaims()`, all 42 tRPC procedures on `protectedProcedure` (`publicProcedure`
is defined and never used), and RLS on all 12 tables. The OAuth callback's `next` param is correctly
guarded against open redirect. **The real hole was open signup**: any Google account could sign in, get
its own household, and spend the OpenAI key at 150 calls/day/user with **no global cap**.

**Shipped: two independent gates, both off when their env var is unset.** Full rationale in
[decisions.md](decisions.md). Gate 1 (`SITE_ACCESS_CODE`) 404s every path at the proxy without an
invite cookie, login screen included — a flat 404 rather than a branded gate page, because a gate page
tells a crawler there is something here worth returning to. Gate 2 (`ALLOWED_EMAILS`) decides who may
hold an account. Vercel Deployment Protection was **rejected**: it gates on Vercel account access, so
every beta tester would need a Vercel seat.

**The design constraint was Griffin's, and it shaped more than the security did:** *make the sharing
changes at the right time.* So unset-means-off — adding a tester is an env change, going public is
deleting two env vars, neither is a code diff.

**The security review earned its place.** Gate 2 as first written lived only in the callback and the
layout, which meant **revocation did not actually work** — a session already issued could keep calling
the API after its owner was removed from the list. The check moved into `protectedProcedure`,
`authedProcedure` (the procedure that *creates* the household row, so the one a non-invited session
could use to bootstrap itself), and `/api/plan/stream`, which bypasses tRPC entirely and is the most
expensive endpoint in the app. Also tightened `GATE_EXEMPT` from prefix to exact match — both exempt
paths are single routes, so a prefix match widened the hole for nothing.

**Two items logged rather than fixed:** **BUG-031** (email is now an authorization boundary, so
Supabase's email/password provider must be confirmed disabled before a second person is invited —
a dashboard toggle, not code) and **BUG-030** (`noindex` + `robots.txt` are deliberately not
env-driven and must be deleted by hand on launch day).

**506 unit tests green across 44 files** (up from 480; +26 in the new `access.test.ts`), lint +
typecheck clean. Branched off `main` rather than `session-43-1e5-plan-rebuild` so it did not wait on
that branch's red E2E suite. **Bug IDs deliberately start at 030** — the 1E.5 branch has already
claimed 023–029 and would otherwise collide on merge. Machine note: the suite took ~20 min under a load average of 53 caused by
Cursor, and one file hit a vitest worker-start timeout — re-run in isolation, 8/8 pass.

---

## Session 42 — 2026-07-27 (1E.7 CLOSED — the app-wide spec sweep, and the gold line)

**The job:** ratify the gold line and apply it, then sweep spec §12 items 01/02/06 plus the pre-spec
`:root` retirement across every surface, so 1E.5's Plan build lands on a palette we are keeping.

**Result: 1E.7 → ✅ CLOSED, M5.7 met.** Detail in [scope-1E.7.md](scope-1E.7.md).

### The gold line — ratified, and it resolved more than it was asked to

> **Gold marks the chef speaking, not content you read.**

Griffin's call. It replaces counting marks with a rule you can apply, and it arbitrates a **contradiction
inside the spec** rather than a violation in the build: law 03 explicitly grants the chef's italic
rationale accent colour while law 06 caps gold at three marks in the content layer. A budget count cannot
settle that. The speaking/reading distinction does, and it gives the same answer on Plan and onboarding.

All four S40 conflicts closed: `SO HERE'S YOUR WEEK` → `text.primary` (its arrows to `text.muted`, since
they were cream and cream is what you press); the intro's gold icon tiles → bare muted icons, which is
what the reflect screen's own guesses list already did two screens later; the baby-stage chips → cream
like every other selected chip, with the amber note around them staying gold; the caught-tray chip →
neutral inset inside a tray that stays gold. It also settled a question nobody asked it to: the shimmer
bar and the landed highlight ring went **indigo → gold**, because both mark the chef *working* — which is
the same answer the Plan design pass reached independently for its own landed ring (S41).

**Flagged, not changed:** Griffin wrote "orb/byline/hook stay gold," but in the build the byline is
**cream** and the hook is **`text.feature`**. "Stay" read as *leave alone*, so neither was escalated —
raising a 25px hook to gold is a visual change, not a mechanical sweep. His call.

### The sweep — 40 files

**Item 01** was the mechanical part and behaved: every `white/x` utility → `[rgba(240,222,190,x)]` at the
same alpha, scripted so the alpha could not drift. Zero cool white remains in `src/`.

**Item 02 was not what the spec said it was.** "Normalise the ambient wash — the rest carry six different
gold opacities" describes the *design frames*. In the build, Plan, Recipes, Groceries and You had **no
ambient wash at all**; only onboarding did. So the item was additive: each surface got a named recipe for
the first time, assigned by role — `ambient` where the chef is talking to you (Plan, You), `flat` where
you are working in a dense list (Recipes, Groceries), `hero` reserved for the orb.

**"Retire the `:root` family" became an alias layer, not a deletion.** Those names are the bridge that
Tailwind's `@theme inline` block and every shadcn primitive read; deleting them meant rewriting ~200 class
usages for no visual gain. Each now aliases the spec token that plays its role, so no independent colour
value survives. The consequential one is `--primary`, **indigo → cream**, which repaints every primary
button in the app — correct per §01 (there is no third accent) and the single most visible change here.

**Item 06** found the radius scale was a multiplier chain landing on 7.2 / 9.6 / 16.8 / 21.6 — none of
them rungs. The named Tailwind steps now *are* the rungs, and ~20 off-scale sites moved onto them.

### Three things worth knowing for next time

1. **Two greps said "clean" while three indigo glows were still live.** `rgba(58,134,255,x)` inside
   `shadow-[…]` does not match a search for the token name or for `bg-`/`border-`/`text-`. They surfaced
   only on reading the diff — cream buttons with blue halos under them. Search by *value*, not by role.
2. **The worked example was not exempt.** Onboarding carried four off-rung radii and an iOS-grey literal
   of its own. "Match the worked example" means match its token discipline, not assume it is finished.
3. **`PROJECT-CONTEXT.md` was stale again** — it still told Claude Design that Plan/Recipes/Groceries/You
   were "the before, do not sample colours from them." That is the exact failure mode S40 caught. Rewritten
   to say the migration is done and to name the three things that are still deliberately un-migrated.

**480 unit + 78 E2E green, lint + typecheck clean, `/visual-qa` re-capture across all five surfaces.**

---

## Session 40 — 2026-07-26 (1E CLOSED — the three gates, run for real)

**The job:** close 1E by clearing its three gates in order. S39 had invalidated every S38 clearance by
rebuilding the reflect screen, deepening the interview, changing the chef prompt and migrating onboarding
to a new design system — so none of this was a formality.

**Result: all three cleared. 1E → ✅ CLOSED, M5 met, 5 of 6 phases done.**
**480 unit + 78 E2E green, planner eval 7/7, lint + typecheck clean.**

### Gate 1 — `/visual-qa`, 0 blockers / 0 high

Judged against **Design Specification v1.0's six laws**, not the superseded `Guidelines.md`. 22 Layer-A
states: onboarding (16) and You (6). The You tab had **no capture coverage at all** for S39's test-mode
card, so two states were added for it and the capture server now mirrors the E2E `DEV_TOOLS_EMAILS`
allowlist.

Two high findings, both fixed and re-captured:
- **The mic toast let the controls under it read through.** At the spec's L5 `.94` fill with
  `saturate(180%)`, "I'll cook for 2 servings." and "Skip this question" ghosted through the panel, which
  reads as a rendering fault rather than a notice. Now opaque at the same hue. The manifest fact claimed
  the toast "does not cover the answer controls" — it never could, at `bottom-6`, so the fact was corrected
  rather than the placement.
- **The You capture was photographing the page before it finished arriving.** The test-mode card renders
  off its own `devToolsEnabled` query, which resolves after the ready text — so the card was missing
  entirely from `you-returning` and, on `you-new`, landed after the viewport had been sized and rendered
  **underneath the fixed tab bar**. Capture bug, not an app bug; fixed with a `settleDevTools()` wait.

One stale ground-truth fact corrected (`ob-diet-caught` still recorded an S38 deviation that had been
closed). A wrong fact is worse than no fact — it is the anchor the whole critique is told to trust.

**Raised, deliberately not fixed:** four places where the build is faithful to a Claude Design pass Griffin
locked and it is *Design Spec v1.0* that disagrees — chiefly the reflect screen's `SO HERE'S YOUR WEEK`
rendering three to six lines of **gold body text** against law 03 ("nothing you read twice is
accent-coloured") and law 06's three-gold budget. Repainting the payoff screen of an interview he just
locked is his call, not a gate finding. Full list in the run's `critique.md`.

### Gate 2 — Layer B, and it earned its keep

**The question Griffin asked: does the real model finish the carton without killing the week's variety?
Yes.** Six real weeks, 42 dinners: the reuse rule fired every time, no week collapsed onto one ingredient,
and every week held **7/7 distinct proteins and 7/7 distinct dish forms**. One bunch of dill genuinely
finished across three different dishes. The model narrates it unprompted in `chefSummary` and visibly
reasons about the tension on the cards ("Break up the protein pattern…", "adding variety after mushrooms
and seafood") — the two rules pull against each other correctly rather than one winning.

**But giving the model a reason to cross-reference days made it reach for three things it must not say** —
all user-visible, all invisible to the mock by construction:
- 🔴 **"reusing olive oil from day 0"** — the internal `dayOffset` vocabulary printed onto a card the user
  reads every week. The same run said "from Monday" elsewhere, so it was inconsistent as well as wrong.
- 🟠 **"use spinach fresh from last shopping trip"** — invented history, on a **first-ever plan**, for a user
  who has never shopped. There is no pantry model; pantry is explicitly V1.5.
- 🟠 **Reuse over-generalised to pantry staples** — "reusing olive oil", "Reusing lemon". Nobody needs help
  finishing a bottle of oil, and it makes the rationale read as filler.

One clause in `PLAN_OUTPUT_RULES` fixed all three (fresh perishables only; refer to the other meal by
**weekday name**; describe only what this plan buys, never what the person already owns), plus a
plausibility guard after round 1 produced "Leftover Pulled Pork Tacos" from a *tenderloin*. **Round 2
re-ran the same three intents on the real model and confirmed all three gone, with variety unchanged.**

The existing prompt test was `toContain`-based rather than an inline snapshot, so the original edit passed
silently — three assertions added to lock the new guards.

### Gate 3 — code review

- **The palette migration warmed the fills but missed the borders.** Three spots still carried
  `border-white/10` — `rgba(255,255,255,0.1)`, the exact cool white **law 04** forbids — on *every
  unselected chip and card in the interview* and the deepen-offer's secondary button. Onboarding is the
  designated worked example for migration passes 2 and 3, so leaving it would have propagated into 1E.7.
  Substituted at the same alpha per the law. Verified: no `rgba(255,255,255,x)` anywhere in onboarding, and
  no `--spec-*` token leaking outside it.
- **Two real defects logged rather than fixed at the gate** — **BUG-020** (`retryFailed` retries *failed*
  saves but never awaits *in-flight* ones, so "All saved." can be shown over a save that has not landed) and
  **BUG-021** (`skipAll` walks the user out to Plan even when the skip mutation fails, doing the opposite of
  the fix BUG-016 landed on the finish path). Both are the once-per-account honesty contract, reached by
  paths BUG-016 did not cover.
- Checked and cleared: `user-dev-tools.ts` re-authorises server-side inside the mutation rather than
  trusting the query, and its delete is correctly scoped to `sourceType:'onboarding'` so the copy's promise
  ("memories from real use are kept") is true. A suspected stale-response race in `useCoreSaves` is **not
  reachable** — the interview has no back navigation, so no turn can be answered twice.

### Not done, and why

The `ux-design-critic` taste pass (step 6 of the `/visual-qa` loop) was **not** run — this session's
standing instruction was not to spawn subagents unrequested. The critique's own "raised" section carries
the taste findings instead.

---

## Session 39 — 2026-07-26 (Griffin's taste pass became a build)

**Started as:** fix BUG-016/BUG-014, then hand Griffin the taste pass on three questions.
**Ended as:** three bugs closed, a deeper interview, a planner-default change to the chef prompt, test mode,
a new design system, and the reflect playback rebuilt from a design pass. **1E did not close.**

### Bugs closed
- **BUG-016** (silent failed save) — `useCoreSaves` names a failure, remembers it by the answer's label, and
  retries on "Plan my first week". The reflect screen no longer claims "All saved" while anything is
  outstanding. A failed `finishOnboarding` now stays on reflect with a live retry: that path writes both the
  memories and the completed flag, so on failure nothing landed and leaving silently just deferred the loss.
- **BUG-014** (typed text lost on error) — clears on success only, matching `talk-to-chef-sheet`.
- **BUG-015** (tap/type race) — the confirm is gated on `talkPending`, and `talkPending` now covers the
  read-back rather than only the write.

### Griffin's taste-pass decisions
| Question | Call |
|---|---|
| Baby-stage follow-up | Keep as built |
| Reflect hook | Cut the categorical opening line; lead with the plate |
| Deep-round depth | Add `skill`; **keep `effort`** (Griffin overruled merging it — an advanced cook can still be exhausted on a Tuesday); cost lands in `goal`, which already carried "Keep costs down" |
| Ingredient reuse | A planner default, not a preference |
| `ALREADY CIRCLING` | Off for R1 — it names dishes nothing carries into generation |
| `safetyFirst` | Off — the recap stays after the playback |
| Closed beta | None. Griffin + wife, wife tests on his phone. **No household sharing pulled into R1.** |

### Built
- **Deep round 4 → 5 questions.** `skill` (0.97) is the only one of time/effort/skill that decides whether a
  recipe is *executable* rather than merely appealing. `goal` raised to 0.85 so the cost signal is reachable.
  `effort` suppressed at a ≤30-minute ceiling (that ceiling already answered it). Policy retuned
  (`minValue` 0.35, cap 6, new `meterTarget` 5 with an eval invariant tying it to what an engaged cook
  actually reaches — the meter used to divide by a cap the policy never hit, so the most engaged user
  possible saw 80%). **7/7 personas.**
- **Ingredient reuse in `chef-system.ts`** — a perishable sold by the bunch, carton or head gets a second,
  DIFFERENT dish that finishes it, guarded so it can never cost variety. **Unverified on the real model;
  Layer B is owed.**
- **Test mode** — `user.devToolsEnabled` + `user.resetOnboarding`, allowlisted by `DEV_TOOLS_EMAILS` (empty by
  default, re-checked inside the mutation rather than trusted from the query), plus a You-tab card.
  Deliberately not a hidden gesture: once the server decides who sees it, hiding it only makes it hard for
  the one person who needs it. **Griffin must set `DEV_TOOLS_EMAILS` in Vercel Production.**
- **Design Specification v1.0** ("Gold voice, cream hand", theme 11i) imported from Claude Design and split
  into three passes. Pass 1 (onboarding) done: `--spec-*` tokens + the elevation ladder in globals.css, the
  orb to its actual specification, the tell-me field rebuilt to spec §09, every cool-white alpha warmed.
- **The reflect playback**, from the design pass. New pure `playback.ts` (16 tests): `playbackGroups` groups
  by kitchen logic and drops empty groups, `weekDecisions` restates each capture as a commitment,
  `chefGuesses`/`isSparse` drive the sparse state. Scrolls with the CTA on a pinned chrome bar. Two new
  capture states (`ob-reflect-deep`, `ob-reflect-sparse`) so the design's central claim — depth reads as
  specificity, not as a longer list — is checkable by looking rather than by argument.
- Also: a verbatim quote of what the user typed, a subline under the hook, and an adults-only hook so a
  skip-heavy run stops falling through to the generic line.

### Found while working
- **`chef-system.ts` is the one prompt file with no snapshot test**, despite `.claude/rules/test-files.md`
  requiring them and CLAUDE.md calling it the single most important file in the product. A prompt change
  landed this session and nothing flagged it. → backlog, Griffin's call on the test-strategy change.
- **Four defects caught by looking at captures rather than by tests:** a stray space before punctuation in
  every playback fact, "Fish are what you want to see more of", the subline duplicating the last week
  decision verbatim, and `talkPending` clearing before the read-back so the confirm was ungated for the tail
  of a capture. The last is the only one a test could plausibly have caught.

### Scope changes
- **New phase 1E.7** (mechanical design-system sweep), ordered **before 1E.5**, because 1E.5 rebuilds Plan
  from scratch and building the signature surface against a retired palette means building it twice.
- 1F's design-system line reframed as the *surface-specific* half of the spec migration (items 03/04/05/07),
  each of which wants its own `/visual-qa` pass.
- **1E did not close.** Its S38 gates were invalidated by this session's work.

### Open questions raised
- How often do two adults in a household actually eat the same dinner? Our research doesn't answer it, and it
  decides how much V1.5 sharing has to do.
- With two users in one household, whose diet governs a shared plan? (Allergies union; the rest is undefined.)

**Green:** 479 unit + 78 E2E, planner eval 7/7, lint + typecheck clean.

---

## Session 38 — 2026-07-25 (1E #4 closed out: visual QA, Layer B, code review)

The three gates 1E was waiting on. **449 unit + 75 E2E green, visual-QA gate PASS (0 blockers / 0 high),
Layer B run, `/code-review` complete across four lenses.** Everything below is on `session-33-you-tab-audit`.

**Built the missing harness.** `/visual-qa` had no onboarding coverage — `tests/e2e/capture/` covered
Plan/Groceries/Recipes/You only. Added `onboarding-facts.ts` + `onboarding.capture.ts` (14 states walking the real
flow from `/welcome`; there is no way to deep-link a turn, and driving it for real is the point) and
`onboarding-live.capture.ts` for Layer B. Generalized `playwright.capture-live.config.ts` from `plan-live` to
`-live\.capture\.ts$` so each surface's live capture is separately runnable.

**Visual QA — three rounds, 13 findings fixed.** Round 1 found four highs: `min-h-full` was a no-op so three
screens never filled the viewport; the "what I caught" tray echoed the chef's reply sentence instead of itemizing
what free text surfaced, and left the answered pill dark; the reflect hook was generic on the core-only path (every
dish-level branch required deep-round data, so the brief's hero moment never fired for the most common completion);
selected allergens were blue, identical to a diet chip. Round 2 added two capture states because two fixes had no
visual proof. Round 3 was the `ux-design-critic` pass, which **corrected round 1's own fix**: centering the turns
traded a void for layout shift under the thumb — measured 36px when the confirm appeared, 77px on the household
turn, moving the stepper being tapped. Rebuilt as two anchored blocks with the confirm's height reserved.

**BUG-005 (app-wide serif) closed, deviating from its "defer to 1F" disposition.** It needed no on-device check:
`--font-sans: var(--font-sans)` is a self-reference, invalid at computed-value time, so the token could never
resolve anywhere. One-line bridge to `--font-geist-sans`. Fixed inside 1E because Griffin's taste pass on chef copy
was about to happen in Times. Blast radius verified by re-capturing all four other surfaces.

**Layer B earned its keep on its first onboarding run.** The tray renders the ops `user.talk` produced — perfect
against a fixture written to emit them, and silently degraded to prose if the real model preferred `remember`. It
didn't: the live model reproduced the brief's own worked example. But it caught a bug the mock structurally could
not: "we do taco night every Tuesday and nobody eats mushrooms" lit the **No restrictions** pill, because the write
created the preferences row, `dietary_framework` defaults to `'omnivore'`, and the client read that default back as
an answer.

**`/code-review` (4 lenses) found a critical bug in this session's own work.** The preselect merge appended without
respecting `multi` and never removed, so tapping "Pescatarian" then typing "actually we eat everything" left both
chips lit and **persisted the retracted answer** — the chef overwriting a correction with the thing it corrected.
Two root causes behind it, both fixed: `changed` was derived from the DB diff (so setting a field back to its
default registered as nothing happening), now derived from the ops; and `utils.user.preferences.fetch()` was served
from the provider's 30s cache, so a second correction inside half a minute read back as the first one's answer.
Guarded by OB12/OB13 and three router tests. Also split `use-onboarding.ts` (338 lines) — the free-text path moved
to `use-onboarding-talk.ts`.

**Nine review findings logged rather than fixed** (BUG-010 through BUG-018), because `/review` says present, don't
auto-apply. Two are recommended before Griffin and his wife run the interview for real, since it fires exactly once
per account and a half-saved first run is not recoverable: **BUG-016** (a failed preference save is silent and the
reflect screen still says "All saved") and **BUG-014** (typed text is cleared before the request resolves, so a
failed capture loses the message the toast invites you to retry).

**Process note:** a concurrent Claude session was editing this repo mid-run — four harness files rewritten under
this session, `test-results/` wiped, and the shared Supabase test user briefly deleted. It invalidated one full E2E
run (15 spurious failures) before it was spotted. Worth a rule: don't run two sessions against this repo, because
they share one Supabase test household.

## Session 37 — 2026-07-25 (QA-process hardening + the harness ported to FFOS)

Infrastructure session, no product work. Ran the five tasks from
`~/.claude/plans/qa-process-hardening-and-ffos-port.md`. **445 unit + 72 E2E green.**
Three commits on `session-33-you-tab-audit`. CI was skipped deliberately (below).

### 1. The dead auth-bootstrap path is fixed, and cold start actually works now
BUG-007's fix left the privileged bootstrap unreachable — it survived only because the
test user already existed. Verified the failure mode empirically before touching it: the
`sb_secret_` key gets `403 bad_jwt: unrecognized JWT kid <nil>` from every
`/auth/v1/admin/*` endpoint, so an admin bootstrap cannot work on this project at all.
Deleted that branch rather than keeping a second untestable one. The harness now creates
`auth.users` + `auth.identities` directly over `DATABASE_URL` and needs **no service-role
key at all**.
- Public `signUp` was the obvious replacement and is wrong twice: GoTrue rejects the
  reserved `@example.com` sentinel (`email_address_invalid` — the admin API skipped that
  check, which is why the old path worked), and it would send real confirmation mail.
  Writing the rows keeps the test identity on an address that can never receive a
  password-reset link.
- Two failures found only by running it cold: GoTrue scans several nullable token columns
  into non-nullable Go strings, so a NULL there fails every sign-in with an opaque
  "Database error querying schema".
- **Verified properly:** deleted the auth user, its public rows and its household, cleared
  the Playwright transform cache, ran from nothing. Setup green, suite green.
- Two one-off failures appeared across the cold runs (OB4, then RG5) and neither recurred;
  OB4 was a stale transform cache (its error line numbers came from an old compile), RG5 is
  a 6s-race spec that passes in isolation. Flagged, not silenced.

### 2. Harness ported to FFOS — validated as genuinely copyable
`harness/` copied verbatim; wrote FFOS's app layer against **/goal** (the north star, and
the only surface with a money-behavior write). **859 unit + 9 E2E green**, Layer-A capture
clean. Branch `e2e-harness-port`. It caught three real UI bugs on its first run — the
sharp one being the debt stack rendering in arbitrary order under a heading promising
"highest rate clears first". Also moved `capture-runtime.ts` into `harness/` (it was
already marked generic but lived in `capture/`), so FFOS copies the core instead of
forking it.

### 3-5. Mock split, cadence, rules, ADVERSARIAL
- `e2e-mock-fixtures.ts` (491 lines) split per-domain under `e2e-fixtures/`; the old path
  is now a barrel, so no import changed. Largest file 151 lines.
- **Layer-B cadence** written into `docs/test-plan.md`: five triggers, plus the honest
  statement that Layer B has run **once, on Plan only** — Groceries/Recipes/You/onboarding
  fixtures are unvalidated against live output.
- Rules renamed `plan-e2e.md`→`e2e.md`, `plan-visual-qa.md`→`visual-qa.md`, globs widened
  from Plan-only to all five covered surfaces, both now nudge Layer B on a fixture edit.
  `test:capture` / `test:capture:live` promoted to npm scripts.
- **ADVERSARIAL seed state** built (capture-only) and it paid for itself immediately:
  **BUG-008** (the meal card prints the cook time twice — and two *different* times when
  `estTimeMinutes` and a time-shaped tag disagree; present on every seeded card, so it was
  in previous captures and got read past) and **BUG-009** (a null-title slot renders as the
  "Thinking…" generating state). Both routed to 1E.5 rather than patched.

### CI: skipped, deliberately
The plan marked it optional and Griffin skeptical. The blocker is unchanged — the suite
uses ONE shared test household with `workers:1`, so concurrent runs race the seed. A
concurrency group would serialize them, but that buys little over the codified wrap-time
gate while adding a failure surface. Revisit if the harness lands in a third repo or if a
second person starts pushing.

---

## Session 36 — 2026-07-24 (Phase 1E #4 onboarding interview BUILT — 1E closes, M5 done)

### What happened
The build session for the last 1E feature. Design was locked (1D) coming in, so this was execution against the
build spec plus the two dependencies it flagged.

**1. `/architect` pass on the household-composition schema — and a real conflict surfaced.** The brief's schema note
said per-member age arrays (`children[ageYears]`), but the **locked design captures three band COUNTS** (Adults /
Children 2-12 / Babies under 2) with no age-entry UI. Griffin ratified **band counts** (match the locked design;
V1.5 Family Member Profiles extends the same JSONB with an optional `members` array — additive, no breaking
migration).

**2. Griffin reframed the servings question rather than picking a side.** Asked whether babies count toward
`householdSize`, he pushed back: it depends on the baby's age — past ~6 months they're increasingly eating part of
the adult meal. That's right, and "babies under 2" is too coarse to act on. Resolution built:
- A **conditional baby-stage follow-up** (Under 6 months / 6-12 months / 12-24 months) appears only when
  `babies > 0`, inside the amber note the design already reveals. **This is a deliberate addition to the locked
  design** — flagged for the taste pass.
- Serving rule follows the stage: under 6m → 0 (milk, no meal impact); 6-12m → 0 servings but the chef is told to
  include a soft, unsalted, hazard-free portion from the same dish; 12-24m → counts toward `householdSize`.
  Griffin's own household (2 adults + baby) derives to 2, matching the old default — no regression.
- **Scope assumption stated:** R1 plans ONE meal per slot and tells the chef how to adapt a portion. Separate kid
  meals = multiple recipes per slot = a schema change, logged to the backlog as V1.5.

**3. The deep-round stopping policy, built as its own tunable task with an eval.** Deliberately **deterministic, not
a per-question model call** — onboarding is the most latency-sensitive moment in the app, and a model call between
every screen would buy question-ordering at the cost of seconds of dead air. A scored bank (`value × novelty ×
fatigue^asked`) with four tunable knobs: hard cap 5, `minValue`, fatigue decay, and a consecutive-low-signal stop.
`scripts/1e-onboarding-planner-eval.ts` runs six personas. **The eval earned its keep on first run:** at
`minValue 0.42` a vegan got a *shallower* interview (3 questions) than an omnivore (4), purely because the
suppressed protein question left the threshold sitting on a cluster of tail values. Tuned to 0.38 → **6/6 pass**,
every engaged persona gets 4.

**4. Built the flow** to the locked design in real components: ember chef presence (reduced-motion honored), the
one-model-per-screen turn (tap answers on top, text field below routed through the existing `user.talk` — no new AI
infra), the "what I caught" tray, the 4-question core, the adaptive deep round with value meter, the opinionated
reflect, and the hand-off. `user.talk` gained a `sourceType` param so interview captures stamp `onboarding` rather
than `explicit` (the build delta the brief called out).

**5. Two self-caught bugs during the build** (worth recording, both would have been quiet):
- `answerDeep` ran a side effect inside a `setState` updater — double-invoked under StrictMode.
- Free-text answers never merged back into local interview state, so answering "we're pescatarian" by *typing*
  would leave the reflect screen, the synthesized memory, and the planner blind to it. Now refetches preferences
  after each capture.

### Decisions
- Household composition = **band counts** `{adults, children, babies, babyStage}`, `householdSize` derived
  server-side (composition is authoritative when sent). Ratified by Griffin.
- Baby stage drives both cooking guidance and the serving count (see above).
- Onboarding-complete flag = `users.onboardingCompletedAt`, read via the `ensureOnboarded` call `OnboardGuard`
  already makes → the first-run gate costs **no extra round-trip**. Both complete AND skip stamp it.
- **No backfill for existing users** — Griffin: "the accounts mean nothing right now." He and his wife will see the
  interview on next load, which doubles as the real-user test.
- Deep-round planner is deterministic (rationale above); AI planner can replace `pickNext()` behind the same
  interface later without touching the flow.
- Interview persists **per question**, not in one batch at the end — abandoning halfway still leaves the chef
  knowing what it was told, and the reflect screen's "all saved" is honest.
- **Deviation from the locked design, flagged:** the plan-setup screen's dinners stepper and lunch/breakfast toggles
  were NOT built. R1 generates dinners only (`mealType: "dinner"` is hardcoded); shipping toggles that do nothing
  would be worse than omitting them. The hand-off is the real Plan intent screen, pre-seeded (door #3, as specified).

### Verification
- **432 unit tests green** (+69: household derivation/notes, planner + stopping policy, synthesis, onboarding
  router, chef-context composition rendering).
- **Planner eval 6/6 personas.**
- Migration `0006` generated + applied.
- **70/70 E2E green**, including OB1-OB8 (`tests/e2e/specs/onboarding.spec.ts`) covering **both required paths**
  (complete + skip), the first-run gate, the mic's "coming soon" answer, and the adaptive round. Assertions go to the
  database, not just the UI.

**Two bugs the E2E run caught, both fixed:**
1. The first-run gate redirected **every** spec to `/welcome` — the harness's test user had a NULL
   `onboardingCompletedAt`. `auth.setup.ts` now stamps the default identity as already-onboarded, and
   `onboarding.spec.ts` restores that default in `afterAll` so it can't poison other specs whatever the run order.
   Exactly the class of regression the harness exists to catch.
2. **BUG-007 — the harness couldn't authenticate at all** (`bad_jwt` on every admin call, all 70 specs unable to
   run). My first diagnosis was wrong: I assumed a stale legacy key and told Griffin to refresh it. He checked and
   said neither key looked changed — which was the right pushback, because `.env.local` already held the new
   `sb_publishable_`/`sb_secret_` keys. Probing each service separately localized it: PostgREST accepts the secret
   key (200) and ordinary password sign-in with the publishable key works (200), but GoTrue's `/auth/v1/admin/*`
   endpoints still expect a JWT carrying `role: service_role` and reject a non-JWT secret key. The harness was
   calling `auth.admin.listUsers`/`updateUserById` to bootstrap a test user that **already existed**.
   `mintSupabaseSession` now signs in with the publishable key first (also removing a 50-page `listUsers` scan from
   every run) and falls back to the privileged bootstrap only if sign-in genuinely fails. **No credential change was
   needed.**
3. OB8 then failed on a bad assertion of mine, not a product fault: the value-meter testid sat on the *fill*, which
   is legitimately zero-width on the first deep question (the meter measures signal captured, not questions
   survived), and a zero-width element is invisible. Moved the testid to the track and strengthened the spec to
   assert the fill actually grows once an answer carries signal.

---

## Session 35 — 2026-07-24 (Phase 1E #4 onboarding — design LOCKED (1D); 1E.5 formalized; color exploration kicked off)

### What happened
Design + planning session (no build). Three threads:

**#4 onboarding interview — design LOCKED to direction 1D "Talk it through."** Iterated in Claude Design with Griffin
across several passes (1A one-per-screen structured / 1B stacked-chat foil, rejected / 1C ambient orb, "felt like a
tech app" → **1D**, the merge: 1C's aliveness + chef warmth via an ember/steam presence + 1A's app-explainer
clarity). The blend problem (voice vs tap reading as "two apps") was solved into **one model per screen**: tappable
answers on top, a bottom "or just tell me" field, a "what I caught" tray that shows only what free-text adds beyond
the pills. Griffin's build calls this session:
- **Mic-as-text for R1.** The bottom field is a TEXT input (routes through `user.talk`); the mic icon stays for the
  feel but fires a "voice coming soon" toast. Dictation/STT deferred (out of R1 — open-questions S35).
- **Weeknight cook-time is a core question, not optional.** Core = 4 (household composition · diet · allergies ·
  weeknight time), then an adaptive opt-in deep round (value-meter + one-tap "I'm good for now").
- **Deep-round stopping policy = a tunable build task** (planner over the question bank + a "learned enough" cutoff
  + hard cap; needs an eval).
- **Household captured as composition + ages** (9-mo vs 3-yr vs 16 = different prep/taste profiles) → a new build
  dependency (an `/architect` pass; R1 recommendation + V1.5 deferral logged in open-questions).
- **Reflect reads like an opinionated cook**; hand-off = the **pre-seeded Plan intent modal** (door #3), not a
  bespoke screen; reduced-motion honored.
Recorded the lock: `surfaces/onboarding/brief.md` rewritten as the build spec; scope-1E #4 → design-LOCKED /
build-pending; onboarding-depth open question resolved; decisions.md entry added.

**Phase 1E.5 "Plan Design Buildout" formalized into the spine** (from the S34 proposal) — a full all-states Plan
rebuild in Claude Design, **must ship before 1F** (Plan is the only core surface never mocked in the Claude Design
system-of-record). See scope-v1 change log + idea-backlog.

**Color/palette exploration kicked off** (Claude Design, this session, continuing). The amber+blue that emerged in
onboarding (amber = chef presence/warmth, blue = action) is provisional; palette **locks in 1F** but is being
explored now so 1E.5 stays compatible. Open question logged (food-right warmth, complementary-yet-distinct pairings,
category distinctness).

### Next
Build #4 in a parallel session (Opus) — it's the 1E close. Color exploration continues in the design session.

---

## Session 33 — 2026-07-22 (Phase 1E You audit surface BUILT — features #1/#2/#3/#5/#6 + first You E2E)

### What happened
Built the **You-tab audit surface** against the imported Direction A (`You.dc.html`), on Opus 4.8 (the S32 kickoff
recommended Sonnet; Griffin ran it on Opus — a new-surface UI build with a small backend delta, well within either).
One scope fork surfaced + decided up front (see decisions.md): the design's hero is free-text "Talk to the chef,"
which is a net-new AI capture task not in the five listed features — **Griffin chose to build the full AI capture
now** (Option B), so `user.talk` shipped this session alongside the deterministic surface.

**Shipped (scope-1E #1/#2/#3/#5/#6 + #7 E2E):**
- **#1 shell + account** — `you-page-client` orchestrator; `user.account` query (name/email/household) → account footer.
- **#2 hard-constraint direct edit** — safety-weighted "I never cook with" card (allergy sub-label via a `(allergy)`
  string marker, no schema change) + soft card (dislikes / cuisines / dietary / household / cook-times). Chips remove
  via `×`, add via a **direct inline input** (deviation from the mock, which routed Add through chat — #2 requires
  fixing without a conversation); scalars edit via a bottom-sheet picker/stepper. All persist via existing
  `user.updatePreferences` and immediately change `getChefContext`.
- **#3 memory ledger** — `memory.list` reads active memories (added `activeOnly` to `user.memories`); provenance
  labels map to `sourceType` (onboarding→"when we started" / explicit→"you told me" / implicit→"I noticed"); new
  `memory.deactivate` + `memory.reactivate` mutations (household-scoped). Dropped `memory.edit` — edit routes to
  Talk-to-Chef re-tell (gap #1). Softened the "I fold older notes together" microcopy (gap #3, dedup is out of 1E).
- **#5 capture confirmation WITH undo** — a single bottom toast on every remove/add/capture with an **Undo** action
  (gap #2). `user.talk` returns an undo payload (before-values + written/deactivated memory ids) so undo reuses
  existing mutations, no bespoke endpoint.
- **#6 implicit surfaced + dismissible** — implicit memories carry the "I noticed" label and dismiss via the same
  `memory.deactivate` (reuses #3).
- **AI capture (`user.talk`)** — `preferences-talk` AI task (snapshot-tested prompt with a load-bearing SAFETY block;
  `[N]` memory-ref → id resolution, id-safe + household-scoped, mirroring grocery-talk). Free text → typed
  constraint/memory ops applied in one transaction. Pure `applyPreferencesTalkOps` (dedupe, allergy-marker
  round-trip, change-detection, undo before-values) kept out of the router for clean unit testing.

**Verification (all green):**
- Gauntlet: lint + typecheck + **363 unit** (mock-tested coerce/apply/routers, auth-checked).
- **First-ever You E2E** (`you.spec.ts` Y1–Y9): render, restriction-remove+undo, dislike-add, household stepper,
  memory-remove+undo, implicit dismiss, ledger expand, **Talk-to-Chef allergy capture end-to-end through the real
  pipeline**, new-user state. Full suite **62 E2E green** (was 53; +9). Added `preferences-talk` fixture to the AI
  mock + `YOU_RETURNING`/`YOU_NEW` seed states (and `userPreferences` to the seed wipe).
- **Real-model safety eval** (`scripts/1e-preferences-talk-eval.ts`, real OpenAI spend): **9/9 pass, 0 safety
  failures** — the real model captures allergies as flagged avoids from "allergic to" / "can't have" / "makes me
  sick", never mis-files a taste dislike as an allergy, and handles diet/cuisine/memory/household/cook-time/forget.
- **Visual-QA** (Layer A): built `you.capture.ts` (4 states) + looked at the pixels vs Direction A — faithful
  (narrative hero, red SAFETY-CRITICAL card, provenance ledger, sheets, new-user state); **0 blockers / 0 high**.
  Critique in `tests/e2e/captures/A-you-*/critique.md`.
- **Code review** (code-reviewer subagent): no critical issues; id-safety + household scoping confirmed airtight, no
  allergy-drop path. Fixed 4 findings: allergy-upgrade of a plain avoid (W1), `(allergy)` marker leaking into
  recipe/plan prompts → strip in `getChefContext` (W2), talk-undo reactivate race → added cancel (W3), missing
  error-state UI for the trust surface (W4); plus prompt-injection disclaimer hardening + a typed `saveField` + an
  `isNew` edge fix. Re-ran gauntlet + You E2E green after fixes.

### Left for later (deliberate)
- **#4 onboarding interview** — still design-gated (Pass-2, not yet designed). The new-user state built here is the
  *audit* sparse state, not the conversational first-run flow.
- **App-wide serif finding** (bug-tracker): headings/prose render in a serif fallback in the headless capture; likely
  a `--font-sans` wiring gap (Geist configured but the utility resolves to the default stack). Confirm on-device;
  a 1F design-system item if real. Not a You-tab issue.
- Carried taste passes (Slice C/D Groceries + Recipes reorg; Recipes double bottom-bar) still owed.

## Session 32 — 2026-07-22 (Phase 1E scoped; OQ#2 resolved; You audit-surface design imported; build deferred)

### What happened
Scoping + design-intake session for **Phase 1E (You tab)** on Opus. Wrote `docs/scope-1E.md`, resolved the
long-standing **Open-Question #2**, wrote the You-tab design brief, Griffin ran the Claude Design pass, and the
chosen direction was imported + inspected. **No product code written** — the build was deliberately deferred to a
clean session (see "Build decision").

**1. `docs/scope-1E.md` written.** M5 ("chef knows you; preferences editable"). Six build features + E2E, each with
acceptance criteria: You shell/account, hard-constraint direct-edit, memory ledger view/manage, onboarding
interview, capture confirmation, implicit-surfacing. Explicit OUT list (proactive nudges, household sharing,
recurring check-ins, memory dedup/decay) to hold the M5 line. Framed on the key realization: **the chef already
personalizes today** (`getChefContext` reads prefs + memories on every generation) — 1E makes that loop *visible
and editable*, it does not build the memory engine. So 1E is mostly frontend + a thin backend delta.

**2. Open-Question #2 RESOLVED — AI-first capture, structured audit (split by data type).** Not one mode. Capture
is AI-first (interview / Talk-to-Chef / thumbs); the You tab is a trust/audit surface, not the primary editor. Two
field classes: **hard constraints** (dietary, allergies, household size, cook-times, cuisines) are AI-set but
**always directly editable** (a mis-remembered allergy is a real-world harm — safety-critical values can't require a
well-phrased sentence to fix); **soft memory** is an AI-captured, correctable ledger. The infra already *is* this
hybrid (`user_preferences` + `ai_memories`, both read by `getChefContext`). → decisions.md; open-questions.md flipped.

**3. Design Pass 1 (audit surface) done + imported.** Brief asked for two contrasting directions (narrative vs
control-panel). Griffin's pick: **Direction A — the chef's narrative read**. Imported via `DesignSync.get_file`
(projectId `8bc73bfa-…`, `You.dc.html`). As-built: prose "Here's what I know about you" hero + primary Talk-to-Chef;
a **safety-weighted** "I never cook with" block (allergies red + SAFETY-CRITICAL badge); a soft
dislikes/cuisines/counts card; a provenance-labeled memory ledger ("You told me when we started" / "You told me" /
"I noticed") with per-item remove + edit + expand; account footer. Two states: returning-user (full) + new-user
("We've just met" / "still learning" sparse). Pointer + as-built + gaps → `docs/design/surfaces/you/brief.md`.

**4. Inspection gaps flagged (fold into the build):** memory *edit* routes through Talk-to-Chef, not inline (lean
"remove + re-tell"; likely drop `memory.edit` from v1); the capture toast has no undo (brief wants one); ledger
microcopy promises "I fold older notes together" (dedup is OUT of 1E — soften copy). The **onboarding interview (#4)
is not designed** — the new-user state here is the audit sparse state, not the Pass-2 conversational flow.

### Build decision — deferred to next session (deliberate, not a stall)
The right container, not a delay. Reasons: (a) it's a full new-surface phase-build (whole tab, 6 field editors, a new
ledger + `memory.deactivate` mutation, first-ever You E2E, `/visual-qa`), not a quick win — it deserves a clean
context budget; (b) the intended build model is **Sonnet 5** (the standing 1E reco), not this Opus scoping session;
(c) #4 (onboarding) is still undesigned, so building now wouldn't close 1E regardless. Next session builds the audit
surface on Sonnet; onboarding follows its Pass-2 design.

### State
- No code change; gauntlet not re-run (nothing to run). 327 unit + 53 E2E remain green from S31.
- 4 of 6 R1 phases done; 1E scoped + design-intaken, **build is the next move.** OQ#2 resolved. BUG-003 still the
  only open parked bug.

## Session 31 — 2026-07-22 (BUG-002 buy-unit consolidation + BUG-001 category fix; 1D fast-follow, shipped)

### What happened
A focused Groceries fast-follow on Sonnet-tier work: closed **BUG-002** (duplicate merge rows) and **BUG-001**
(quick-add category misfire), and cleared the two deferred 300-line-rule splits. In-pattern Groceries change, no new
surface, no schema change, no design pass. Gauntlet + full E2E + code-review, shipped.

**1. BUG-002 — buy-unit consolidation (`src/server/grocery/buy-units.ts`, new).** The aggregator under-merges by
design, so the same item split across rows (`Salt 3.25 tsp` + `Salt to taste`; `Carrot 1.5 lb` + `Carrot 0.5 cup`).
Added a curated **buy-unit table** on top of the under-merge, keyed on the AI's `canonicalName`:
- **Staples** (salt, pepper, oils, dried spices, vinegars) collapse to one **unquantified** row — the measured tsp is
  shopping noise (Griffin's call: drop the number; the per-meal amounts survive in the amber-dot breakdown).
- **Concrete buy-unit** produce (carrot→lb, onion/tomato/bell pepper→count, potato→lb, …) collapses to one row that
  sums the buy-unit and **absorbs off-unit amounts without converting** (no fake lb↔cup math), tiebreaking to a plain
  count so "2 carrots + 0.5 cup" shows "2", not "0.5 cup".
- **Safety unchanged:** the table only ever *increases* merging for the named set and can **never** merge two
  different items (a table miss = the status-quo duplicate, never a bad merge).

**2. BUG-001 — `guessCategory` whole-word matching (`src/lib/grocery-categories.ts`).** Substring `includes` sent
"watermelon"→beverages (via "water"), "butternut"→dairy, "eggplant"→dairy for ~1s before the AI tidy. Now whole-word
(+ simple -s/-es plural), with an allowlist for the intentional `berr` stem and multiword phrases, plus added produce
terms (watermelon/melon/squash/eggplant). A pre-existing keyword-ordering quirk (`ice cream`→dairy via "cream") is
left alone (self-corrects via tidy). New `grocery-categories.test.ts`.

**3. Two 300-line-rule splits, re-export-preserving (zero caller churn).** `aggregate.ts` (was 312) → quantity parser
extracted to `quantity-parse.ts`, re-exported. `grocery-generate.ts` (was 313) → `collectSourcedLines` +
`sweepStragglers` + `soloFallback` extracted to `grocery-collect.ts`. Every touched non-test file is now < 300.

**4. Code review (xhigh) — found + fixed one low-severity UX-correctness edge before ship.** `finalizeBuyUnitAmount`
would show a small preferred-unit amount and drop a larger off-unit total (e.g. carrot measured only in count + cup,
cup listed first → "0.5 cup"); the off-unit tiebreak now prefers a plain count. No high/medium bugs (the two splits
are byte-identical moves behind re-exports).

### State
- **Green:** lint + typecheck clean; **327 unit** (+21) + **53 E2E** pass. Groceries E2E (GR1–GR11, GR-L1/L2)
  unaffected by the buy-unit change.
- **BUG-002 + BUG-001 → Resolved** in `docs/bug-tracker.md`; the `grocery-generate.ts` split idea → SHIPPED in
  idea-backlog. **BUG-003** (cooked-harvest write in `recipe.list`) remains the only open parked bug.
- 4 of 6 R1 phases done. **Next: Phase 1E (You tab)** — see whats-next.

## Session 30 — 2026-07-21 (BUG-004 CLOSED — Phase D + real-model eval + rate-limit fix; shipped)

### What happened
Finished **BUG-004** (grocery-list latency) end to end and closed it. Build session on Opus (bumped from the
planned Sonnet mid-session for the review + rate-limit fix). Migration applied, Phase D built, real-model eval
run, one high-severity review finding fixed, and shipped.

**1. Migration `0005` applied.** The Supabase project was live (not paused). `normalized_ingredients` +
`normalized_at` columns confirmed on `recipes`.

**2. Phase D — honest straggler hint + instrumentation + first Groceries latency E2E.**
- `grocery.current` now returns `pendingRecipeCount` (unready cookable slots) while the list is `pending`/`hydrating`;
  `groceries-page-client.tsx` shows **"Finishing N recipes…"** (names the count, not a generic shimmer) on the
  straggler path. Confirm stays instant; common all-cached path is one honest beat → list.
- **Early-confirm instrumentation** in `grocery-generate.ts`: one log line per confirm with `stragglers`,
  `normalizeMisses`, `items`, `confirmMs` — the metric that gates whether true section-streaming (#2) is ever built.
- **First Groceries latency E2E:** GR-L1 (fully-cached plan → merged list renders fast, zero normalize hang) and
  GR-L2 (stragglers → the honest "Finishing 2 recipes…" hint). Two new seed states (`GROCERY_PENDING_CACHED`,
  `GROCERY_HYDRATING_STRAGGLERS`) that materialize a real plan + cached recipes + slots. 53 E2E green.

**3. Real-model eval (gated spend, 8 gpt-4.1-mini calls) — PASSED.** A throwaway `tsx` script
(`scripts/bug004-normalize-eval.ts`) ran a realistic 7-dinner week both ways:
- **Merge quality equivalent.** Batch and per-recipe produced the same rows/sums/merges — garlic ×6 → 15 cloves,
  salt ×4, olive-oil ×4, all identical. The **scallion↔green-onion synonym canonicalized identically in both paths
  with zero co-occurrence advantage** — the clincher for the load-bearing "batching did no correctness work"
  assumption (the rule is in the prompt, not learned from the batch). The only diffs were cosmetic name variance
  ("fresh basil"/"basil", "diced tomato"/"tomatoes") that yield the same rows — and that variance exists run-to-run
  *within* the batch path too, so it's model nondeterminism, not a regression.
- **Latency:** the batch reproduced at **27.1s** this run (S28 baseline 37.7s; model latency varies, always far
  over Griffin's 15s bar). AFTER: **0 normalize calls at confirm**, aggregate ~0ms → confirm→ready is effectively
  instant on a fully-reviewed week; each recipe's ≤5.4s normalize was paid during review, off the confirm path.

**4. Code review (high effort) — found + FIXED a high-severity regression before shipping.**
- 🔴 **Rate-limit fan-out.** `normalizeSlot` was an `aiProcedure`, sharing the user's **10-calls/min** interactive
  bucket. A full-week review fires 7 hydrate + 7 normalize = ~14 calls/min → the later ones 429. A 429 on *hydrate*
  hits the walker's `onError` (marks the slot failed, no auto-retry → stuck card); a 429 on *normalize* leaves the
  cache null → confirm falls back to the 27–37s batch — defeating BUG-004 exactly on a fully-reviewed week. The mock
  E2E can't catch it (limit relaxed to 1000 under the mock). **Fix:** a new `bgAiProcedure` with its own background
  rate-limit bucket (`AI_BG_RATE_LIMIT` = 30/min, key `ai:bg:${userId}`) that (a) can never 429 a user-visible
  hydrate and (b) doesn't double-charge the 150/day budget the recipe-generate already counted. `normalizeSlot`
  switched to it. New `ratelimit.test.ts` locks the bucket isolation. 306 unit green (+3).
- Logged (non-blocking, deferred): `grocery-generate.ts` is 313 lines (over the 300 rule → split follow-up in
  idea-backlog); GR-L2 asserts the hint on a hand-seeded `hydrating` row rather than driving the full
  pending→straggler→ready transition (E2E coverage note; the unit layer covers residual-normalize).

**Gauntlet:** lint + typecheck clean, **306 unit + 53 E2E green**, real-model eval passed. BUG-004 → **Resolved**.
The S28 60s stopgap timeout stays as belt-and-braces for the rare residual batch.

---

## Session 29 — 2026-07-21 (Generation-architecture rethink — planning + Phases A–C built)

### What happened
Planning session for **BUG-004** (grocery-list generation latency), then built the core fix (Phases A–C).
Opened in plan mode, consulted `system-architect`, locked the approach, got Griffin's sign-off, and implemented
the server-side latency win. Plan: `~/.claude/plans/resume-meal-app-peppy-simon.md` (architect memo:
`…-peppy-simon-agent-a9a263c2c4d111270.md`).

**The pinch (confirmed in code).** Hydration already runs in the background during plan review (good). The 37.7s
lived entirely in `grocery.generate` at confirm: ONE batched `ingredient-normalize` over the whole week's ~70
ingredient lines, then the instant deterministic aggregate. The load-bearing realization: **normalize is a pure,
per-line function and recipe rows never mutate in place** (`plan.modify` makes a NEW recipe row), so the result is
cacheable forever and can be computed during the review window the user already spends.

**Built (A–C), gauntlet green — 302 unit tests (+8), lint + typecheck clean:**
- **A — schema.** Added nullable `normalized_ingredients` (jsonb) + `normalized_at` to `recipes` (migration
  `0005_nosy_mandroid.sql`, additive → no backfill). Shared `NormalizedResult` type/Zod moved to a client-safe
  `src/lib/normalized-ingredient.ts` so the AI task and the DB schema share one shape without a circular import.
- **B — cache at review time.** New best-effort `cacheSlotNormalization` (`plan-hydrate.ts`) + a `plan.normalizeSlot`
  procedure; the review-time walker (`use-plan-hydration.ts`) fires it right after each hydrate succeeds.
- **C — cache read at confirm.** `grocery-generate.ts` reads the cache (length-aligned) and AI-normalizes only the
  misses; a fully-reviewed week makes **zero AI calls at confirm** and skips the "normalizing" phase.

**One deliberate divergence from the architect's memo.** The memo suggested normalizing *inside* `hydrateSlotRecipe`.
Instead I **decoupled** it into a separate `plan.normalizeSlot` call the walker fires after hydrate. Reason: an
in-hydrate normalize would make a tapped recipe wait recipe-gen **+** normalize (~3–6s longer) before it's readable
— regressing the "read the recipe while reviewing" flow that motivated plan-time hydration. Decoupled keeps the
card/sheet at today's latency, is serverless-reliable (its own request, not a killed fire-and-forget), and the
confirm-time fallback still covers any recipe whose normalize hadn't finished.

**Griffin's two product calls (via the plan):** (1) confirming before the walk finishes stays instant + shows an
**honest "Finishing N recipes…" hint** (Phase D); (2) ship the **minimal** loading treatment now, **defer** true
server-side section-streaming until instrumentation shows early-confirm actually hurts.

**Deferred to the next session (all need the live DB, which was paused):** apply migration `0005`; Phase D (the
honest straggler hint + first Groceries E2E specs — a light design-pass candidate); the real-model eval
(per-recipe == batch merge quality + a real before/after latency capture). BUG-004 stays `in-progress`.

---

## Session 28 — 2026-07-21 (Slice 5 WRAP — 1D CLOSED + shipped to prod)

### What happened
Ran the full Phase 1D wrap and closed the phase. All in-scope features were already built (S22–S27); this session
was the quality gauntlet + the real-model soft-DoD gate + deploy.

**1. Code review (Slice C/D diff, 47 src files, high effort).** 5 findings, none blocking. Dismissed a
data-loss candidate (verified `grocery-generate.ts` scopes the regen delete to `sourceType:"recipe"`, so
manual/staple items survive a retry — the code comment is accurate). Fixed 3 (→ bug-tracker Resolved):
grocery-row name-edit was a bare `<p onClick>` (a11y → keyboard-accessible `<button>`); manual reorder renumbered
only unchecked items (→ renumbers the whole list); `commitEdit` double-fired on Enter (→ `handledRef` guard).
The 2 low findings (guessCategory compound-word misfire; harvest-writes-in-`recipe.list`) → bug-tracker Open.

**2. Real-model merge-quality eval (soft DoD #2 — Griffin's eye).** A throwaway `tsx` script (1C precedent, since
deleted) ran the true production path on the live model: 7 real dinners → 7 real recipes → 70 ingredient lines →
the real `ingredient-normalize` call → the pure aggregator → 49 merged items. **PASSED (Griffin signed off):**
9/9 merge sums hand-verified exact (garlic 3+4+4+4+3=18 cloves; salt 3.25 tsp; olive oil 7 tbsp…); the hard
canonicalization worked (**scallions + green onion → merged**); **zero mis-merges** (red vs yellow onion,
olive/vegetable/sesame oil, lemon vs lime juice all correctly separate). NL→ops also clean (taco night added the
right 5 items; "what am I out of" returned no ops; "remove the milk" resolved the ref safely). Blemishes are
safe under-merges (duplicate salt/pepper "to taste" lines, carrot lb+cup) → bug-tracker BUG-002 (buy-unit
fast-follow).

**3. A real risk the eval surfaced → generation-architecture rethink (BUG-004).** The single batched normalize for
a full 7-dinner week took **37.7s** — over the 30s one-shot AI timeout — so a full week could error. **Stopgap
shipped:** per-call timeout override on `generateStructured`; `ingredient-normalize` now gets the 60s stream-tier
bound (tested). **But** perceived generation time is too high regardless (Griffin: even 15s is too long on a
loading screen), so we're doing a **material generation-architecture rethink as the next focus** — direction
locked: **(#1) normalize incrementally during plan review** (each recipe normalizes as it hydrates → confirm runs
only the instant pure aggregate) **+ (#5) progressive/legible loading**, with **(#3) ingredient caching** as the
compounding follow-up. Open to a more creative approach in the design pass. Sequence: 1D ships now on the stopgap;
the rethink is its own planning session. (Current flow, for reference: plan-gen = concepts only → per-slot
`hydrateSlot` recipes in the background during review → one big normalize+aggregate at confirm = the pinch.)

**4. New: a parked-bug tracker system** (Griffin's ask — no more bugs rotting in a backlog). `docs/bug-tracker.md`:
every parked defect gets an id + repro + severity + "address by" target + open/closed status, reviewed every
session. Wired into the session-end protocol in CLAUDE.md; saved as a standing (cross-project) preference.

**5. Visual QA — extended the capture harness to Groceries + Recipes** (it was Plan-tab only). New Layer-A capture
specs (`groceries.capture.ts` + `recipes.capture.ts` + their `*-facts.ts`), `capture-runtime` gained a
`useHud:false` flag for tabs without a debug-HUD section, and `playwright.capture.config.ts` now globs all
`*.capture.ts` (excludes `-live`). Captured 11 states (6 Groceries + 5 Recipes), read every PNG, critiqued
against the rubric. **Gate PASSED: 0 blockers, 0 high.** Everything renders faithfully to the imported design.
Non-gating: the Recipes double bottom-bar (logged taste-watch) + the minimal error void (scope-deferred).

**6. Verification.** 294 unit + **51 E2E** green; lint + typecheck clean; the 10-minute loop runs end to end on a
real week (idea → plan → hydrate → confirm → list) — confirmed via the eval's real-model pipeline run.

### Result
**Phase 1D (Groceries) is COMPLETE — 4 of 6 R1 phases done.** Merged to prod. Next: the generation-architecture
rethink (planning session — see whats-next).

---

## Session 27 — 2026-07-21 (Slice D COMPLETE — the Recipes-tab reorg #14 + cooked-signal harvest)

### What happened
Imported the chosen Recipes-tab design from Claude Design and built the reorg in real components, plus the
cooked-signal harvest it depends on. **Slice D is now complete** (all three features: #11, #12, #14). 294 unit
+ 51 E2E green (first-ever Recipes E2E coverage); lint + typecheck clean; prod build compiles.

**Design chosen (direction "d", the invented one).** Not the three-shelves default — a hybrid: a horizontal
`RECENTLY COOKED` strip up top, a segmented `All · Favorites · Cooked` control over the deliberate library
(paginated, 5 + "Show N more"), a collapsed-by-default `FROM YOUR PLANS` shelf, and a floating bottom toolbar
(search pill + a circular ＋ that opens Generate / Import URL). Imported via `DesignSync.get_file`, archived at
`docs/design/surfaces/recipes/imported.dc.html` (URL + projectId recorded in the brief).

- **Cooked-signal harvest** (`src/server/recipes/harvest-cooked.ts`). A recipe is cooked when it's the recipe
  of a **confirmed plan slot whose date has passed**. Runs **lazily on `recipe.list`** (not at confirm — the
  slot dates are still in the future then, and there's no scheduler): an idempotent, guarded `UPDATE` stamps
  `lastCookedAt` to the max past-slot date only when newer than what's stored, so the many list refetches per
  session write nothing once caught up. Wrapped in try/catch in `recipe.list` (non-fatal — the list must render).
  Stamps at **noon-UTC** of the cooked day so the card's "Cooked Jul 12" survives timezone formatting. 5 unit tests.
- **Cook = graduation (harvest also detaches).** A plan recipe that gets cooked but was never favorited would
  otherwise keep its `sourcePlanId` and **cascade away when the plan is replaced**, losing cooked history. So the
  harvest also nulls `sourcePlanId` when it stamps — matching the recipes-schema "nulled on graduation
  (favorite/**cook**)" contract. Cooked history is durable.
- **Favoriting = promote (`recipe.favorite`).** Favoriting a plan draft nulls its `sourcePlanId` in the same
  `UPDATE`, detaching it so it survives plan replacement. Only on favorite=true; unfavoriting never re-attaches.
  The client patches optimistically (nulls `sourcePlanId` locally) → the card jumps to the library with a
  one-shot highlight ring + a "Moved to Your recipes" toast. 2 unit tests.
- **Draft signal = `sourcePlanId != null`, not `sourceType`.** The mock flips `source:'plan'→'ai'` on promote;
  in real data that would discard honest provenance. Instead the ephemeral-membership discriminator is the
  cascade FK itself (`sourcePlanId`). `sourceType` stays truthful; `plan_generated` now maps to "AI" on the
  card (fixes the old fall-through-to-"Manual" bug the brief flagged). Nothing keyed drafts off `sourceType`
  (verified: only plan-hydrate writes `sourcePlanId`, only the FK cascades), so this is safe.
- **UI, real components.** New: `recipes/types.ts` (shared row type + `isPlanDraft`/`formatCookedDate`/
  `recipeMeta`), `cooked-strip.tsx`, `recipe-filters.tsx`, `plan-drafts-shelf.tsx`, `recipe-toolbar.tsx`
  (floating search + ＋ popover), rewritten `recipe-card.tsx` (row layout, draft/cooked badges, promote ring)
  and `recipe-library.tsx` (orchestrator: partition → tiers, search as a flat cross-tier mode, promote/toast).
  Search reaches every tier (the existing `recipe.search` already spans all household recipes); typing switches
  the tiered view to a flat result list. All files < 300 lines.
- **"+" menu = Generate / Import URL only.** The mock's toast also lists "Add manually," but no manual-entry
  flow exists and it's out of 1D scope; dropped it (logged in idea-backlog).
- **E2E: first Recipes coverage.** `recipe-seed-states.ts` (RECIPES_LIBRARY / RECIPES_COOKED_HARVEST /
  RECIPES_EMPTY) + `seedRecipeState` (+ `wipe` now clears recipes). `recipes.spec.ts` RC1–RC10: tiers render,
  Favorites/Cooked filters, pagination, drafts fold/unfold, **favorite-promote (detach persists across reload)**,
  **search reaches drafts**, the ＋ menu, **the harvest driven end to end through a past confirmed slot**, empty state.
- **Visual check.** Drove the built tab in the harness + eyeballed screenshots (tiers, cooked badges, blue
  "PLAN DRAFT" badge, ＋ popover). One fix: bumped the library/search bottom padding (`pb-24`→`pb-40`) so the
  last draft cards clear the floating toolbar + tab bar on a full scroll.

### For Griffin (taste review — mechanics are machine-verified)
- **The double bottom bar.** Faithful to the chosen design, the floating search/＋ toolbar sits just above the
  tab bar. On a 430px phone that's two stacked bars at the bottom — worth your on-device eye (logged as a
  taste-watch in idea-backlog). Everything else is low-risk.
- **Does the tier split read right?** Cooked strip + segmented library + folded drafts — does it feel calm and
  obvious, or is the cooked-in-two-places (strip AND filter) redundant to you?
- Not yet run on the real model (wrap-time, Slice 5): hydration/merge/NL-ops quality — the harness mocks the AI.

## Session 26 — 2026-07-21 (Slice D — staples + Talk-to-the-Chef; Recipes reorg design kicked off)

### What happened
Built the two design-independent Slice D features (both already in the imported Groceries design), and kicked
off a design pass for the third (the Recipes-tab reorg, a genuinely new surface).

- **Staples chip row (#12).** New `staples` tRPC router (`list`/`add`/`setActive`/`remove`; `add` is
  idempotent-by-name → re-adding reactivates instead of duplicating), household-scoped over the existing
  `staple_items` table (RLS already shipped in migration 0002). `StaplesRow` renders the "QUICK ADD · YOUR
  STAPLES" row, showing active staples **not already on the list** — a tap optimistically adds the item
  (reusing `grocery.addItem` with the staple's curated category + `sourceType:"staple"`), so the chip drops
  out of the row on its own (the design's "dismiss", for free). No AI tidy on staple adds (curated category
  already known → no needless spend). Staples remain **offered, not auto-added** to the projection (scope open-Q #2).
- **Talk-to-the-Chef grocery sheet (#11).** New `grocery-talk` AI task: a free-text request → `add`/`remove`
  ops + a one-line reply (snapshot-tested static system prompt; loose AI schema coerced to typed ops, dropping
  anything nonsensical). New `grocery.talk` router applies the ops in a transaction. **ID-safety** (the plan's
  risk note): the model never sees or emits a db id — it references items by a numbered `[N]` ref we assign,
  and the router resolves it to a real id from the household's own list + bounds-checks it, so a hallucinated
  ref is ignored. Hard 12-op cap; adds dedupe against the list; query-only asks return zero ops + the answer.
  The brain-icon sheet reuses the **shared** `TalkToChefSheet` (relocated `plan/` → `components/shared/`, +
  `placeholder`/`resultMessage` props) instead of a duplicate.
- **Recipes-tab reorg (#14) — design pass kicked off, not built.** It's the plainest surface in the app (a
  flat card list) and the reorg is a real IA change, so per the design-pass gate it gets a design pass first.
  Wrote the brief (`docs/design/surfaces/recipes/brief.md`) + a ready-to-paste Claude Design prompt asking for
  several tier-model directions plus one of Claude Design's own. Griffin is running it. **Cooked-signal
  resolved** (Griffin): auto-stamp `lastCookedAt` from a past confirmed plan slot; build the harvest with the reorg.
- **E2E extended to Slice D** (GR8–GR11): staple chip add + auto-dismiss, Talk-to-Chef add-for-a-meal,
  query-only (no change), and remove-by-`[N]`-ref (the ID-safety path). Deterministic `grocery-talk` fixture +
  staple seeding added to the harness.

### Verification
- **287 unit** (+29: staples router, `grocery-talk` task incl. prompt snapshot + coercion, `grocery.talk`
  router incl. the out-of-range-ref ID-safety test) + **41 E2E** (+4 grocery) green; lint + typecheck clean.
- Not yet on the real model: NL→ops quality (does "add stuff for tacos" pick sensible items) is a wrap-time
  real-gen check + Griffin's taste pass — the harness mocks the model.

### Owed to Griffin
- Taste pass on Slice C (carried) + the new Slice D pieces (staples row reads right? Talk-to-Chef feels like a
  real shortcut?). Mechanics are machine-verified.
- The Recipes reorg build resumes when Griffin hands back the chosen design URL.

---

## Session 25 — 2026-07-21 (Slice C complete — the shoppable list UI)

### What happened
Built Phase 1D Slice C: the imported Groceries design is now a working, shoppable list. The Slice B backend
(generate → merged `grocery_items`) already produced the data; this session made it interactive.

- **7 new grocery mutations**, split across two files to hold the 300-line router rule and spread back into
  `groceryRouter` (client still calls `trpc.grocery.*`): `grocery-item-mutations.ts` (`editItem`, `splitItem`,
  `clearChecked`, `tidyItem`) + `grocery-organize.ts` (`setOrganizeMode`, `reorderSections`, `reorderItems`).
  All household-scoped, Zod-validated, co-located tests. `splitItem` un-merges a multi-source row into one
  line per originating recipe (each with that recipe's own qty, parsed by the aggregator's `parseQuantity`) —
  a direct `grocery_items` edit, no `mergeOverrides` (mid-week resync stays deferred). `tidyItem` is an
  `aiProcedure` reusing `ingredient-normalize` on one line to categorize a quick-added item (non-fatal).
- **Optimistic `use-grocery-mutations` hook**, modeled 1:1 on Plan's pattern (cancel → `setData` → invalidate
  on settle, rollback on error). Check-off, add, edit, reorder, clear feel instant; add uses a temp-id → real
  swap then fires the background tidy; split re-fetches (1→N is too structural to patch).
- **The shoppable UI** (component-split to stay under 300 lines): `grocery-list` (orchestrator + DnD),
  `grocery-list-header` (eyebrow + progress bar + quiet completion banner + Copy/export), `organize-toggle`,
  `grocery-section` (sortable aisle), `grocery-row` (checkbox, amber merge dot when `sources.length > 1`,
  inline name/qty edit, expand → per-meal breakdown + "Split into separate items"), `add-item-row` (top +
  bottom quick-add), `got-it-zone` (the one-zone check-off drop). New client helpers in
  `grocery-categories.ts` (`CATEGORY_LABELS`, `guessCategory`), `grocery-format.ts`, `grocery-export.ts`.
- **Drag-reorder = `@dnd-kit`, touch-first** (`PointerSensor` distance 8 + `TouchSensor` long-press delay 200
  + `KeyboardSensor`). Sections reorder in grouped mode (persist `aisleOrder`), items reorder in manual mode
  (persist `position`). Chosen over the design's native HTML5 drag because that's dead on touch and this is a
  phone-first app — `@dnd-kit` becomes the app's one drag solution going forward (Griffin's call, see below).
- **Quick-add**: instant client keyword category guess → optimistic insert → background `tidyItem` refine;
  client-side exact-name **dedupe pill**. **Export**: grouped plain text to the clipboard (the V1 fallback).
- **E2E extended to Groceries**: `wipe()` now clears grocery tables; new grocery seed states
  (`GROCERY_READY/GENERATING/ERROR/PENDING`) + `seedGroceryState`; `groceries.spec.ts` GR1–GR7 (generation
  states, one-zone check-off + persistence, quick-add + dedupe, organize-mode + section-reorder persistence).
  GR7 caught a real test race — `page.reload()` aborting the in-flight persist — fixed with `waitForResponse`
  (the reorder itself persists correctly; not a product bug).
- **Green**: 248 unit (+24) + 37 E2E (30 Plan unchanged + 7 Groceries). Verified the rendered screens against
  the imported design (grouped, checked/one-zone, ungrouped) — faithful.

### Decisions (see decisions.md, 2026-07-21)
- **Drag = `@dnd-kit`, touch-first** (Griffin: build toward the phone gesture the native app will use; web is
  secondary and gets rebuilt later). **Same architecture across the app** is a hard requirement — Slice C adds
  zero new patterns beyond `@dnd-kit`; everything else reuses tRPC + the Plan optimistic pattern + vaul + glass.
- **The Groceries design is not a "new design language"** — it inherits the existing system. But it's the
  highest-fidelity surface we have, so a **"refresh Plan (+ Recipes) visuals to this bar"** pass is logged for
  **1F** (idea-backlog). Not Slice C scope.
- **Quick-add tidy** = client guess + background AI refine, non-fatal; dedupe is a client exact-name check (AI
  canonical dedupe deferred). **Talk-to-Chef (#11) + staples (#12) + Recipes-tab reorg (#14) are Slice D.**

## Session 24 — 2026-07-20 (Slice B complete — list generation + the hybrid merge)

### What happened
Built Phase 1D Slice B: a confirmed plan's hydrated recipes now become a merged, categorized grocery list.
The schema (`grocery_lists`/`grocery_items`) already existed (migration 0004, S22), so this was the
generation pipeline + the merge, no new migration.

- **The deterministic aggregator** (`src/server/grocery/aggregate.ts`) — the correctness core. A pure
  function that parses each recipe line's own quantity string (fractions, mixed numbers, unicode ½, ranges,
  "a pinch"→unquantified) and sums same-`(canonicalName, canonicalUnit)` lines. **Under-merges** by design:
  different name, different unit, or a low-confidence line ⇒ separate rows (cherry ≠ roma tomatoes; cups ≠
  tbsp). **22 unit tests** cover the parser edge cases and every merge/under-merge branch.
- **`ingredient-normalize` AI task** (`src/server/ai/tasks/ingredient-normalize.ts` + prompt) — one batched
  call returning per-line `{canonicalName, category, canonicalUnit, numericQty, confidence}`. **Semantics
  only, no arithmetic.** Strict-mode Zod, category coerced to the enum, robust `reconcileNormalized`
  post-processing (one clean line per input even if the model drifts). **Snapshot-tested system prompt** +
  9 tests.
- **`grocery.generate` orchestration** (`src/server/trpc/routers/grocery-generate.ts`) — idempotent + race-safe
  (the `generationStatus` column is the CAS token, same trick as Slice A): claim `pending|error → hydrating`,
  sweep straggler slots, `normalizing` (the AI call), `aggregating` (pure), then a **transactional replace of
  only `sourceType:"recipe"` items** (retries + any manual/staple items coexist) → `ready`. Failure records
  `generationError` and returns (status is the one error channel). 6 state-machine tests.
- **`plan.confirm`** now also creates the `grocery_lists(pending)` for the plan, guarded so a re-confirm can't
  spawn a duplicate. Stays fast — the Groceries tab does the actual projection.
- **Groceries tab** (`groceries-page-client.tsx`) — polls `grocery.current` while non-terminal, fires
  `grocery.generate` once on a `pending` list, and renders **generating** (phase-named chef-voice copy +
  shimmer), **error** (reuses Plan's stream-error card + one-tap retry), and **ready** (a plain grouped list —
  the designed list with amber dots / drag / one-zone check-off is Slice C).
- **E2E fixture** for `ingredient-normalize` added to the deterministic AI mock, so the whole generate
  pipeline runs under the harness with no OpenAI spend.
- **Aisle taxonomy moved to `src/lib/grocery-categories.ts`** (client-safe) and re-exported from the schema,
  so the UI shares the category list without pulling Drizzle into the browser bundle.

### Key build decisions (full detail in decisions.md, 2026-07-20 S24)
- **Resolved the `numericQty` / "no LLM arithmetic" overlap:** the AI's normalize outputs are grouping keys
  only — a wrong key can only *under*-merge (safe), never mis-merge. All arithmetic is pure code; `numericQty`
  is a solo-only fallback for lines the code parser can't read.
- **Amber merge-review dot = `sources.length > 1`, derived at render (no new column)** — faithful to decision
  #6, keeps migration 0004 unchanged. Slice C renders it.

### Verification
- **224 unit tests green** (was 185; +39: 22 aggregator, 9 normalize, 6 generate, 2 confirm). Lint + typecheck
  clean.
- **E2E suite green — 30/30** (Plan tab, incl. the confirm flow that now also creates the pending grocery
  list; no regressions). Groceries has no E2E coverage yet — the harness extends to it in Slice C/wrap.

---

## Session 23 — 2026-07-20 (Slice A complete — the hydration spine)

### What happened
Built the rest of Phase 1D Slice A on top of S22's schema+invalidation. The plan slot's lightweight
"meal concept" now hydrates into a real, readable recipe in the background during Plan review.

- **`plan.hydrateSlot` mutation** (`aiProcedure`, reuses the 1B `generate-recipe` task). Orchestration
  extracted to `src/server/trpc/routers/plan-hydrate.ts` (`hydrateSlotRecipe`) to keep the router under 300
  lines and make the race-safety unit-testable. Idempotent: skips `ready`/non-cookable slots, **atomically
  claims `none|stale → hydrating` using the status column as the CAS token**, generates, then **conditionally
  writes back `→ ready` only if still `hydrating`** (a modify that lands mid-generate isn't clobbered — the
  orphaned recipe cascades away via `sourcePlanId`). 8 unit tests cover idempotency, the claim, the stale
  write-back, and non-fatal generation failure (releases the claim to `none`).
- **CAS token = status column, not `updatedAt`** (corrected the plan): `defaultNow()` rows carry
  sub-millisecond precision that truncates when read into JS, so an `updatedAt =` guard would never match and
  hydration would silently never fire. The atomic status-column claim is the correct, footgun-free token.
- **Client hydration walker** (`use-plan-hydration.ts`): walks cookable slots **day-1-first, one at a time**
  (gentler on the AI budget than a parallel burst), **tap-to-prioritize** jumps a slot to the front, and
  **patches each result into the plan cache** (no invalidate → no refetch storm, modify's optimistic state
  untouched). Cards go **shimmer → ready**. Skips past days in the mid-week view (found in review — they're
  cooked/gone and the list was projected at confirm).
- **Meal-sheet recipe upgrade**: extracted a presentational **`RecipeView`** from `recipe-detail.tsx` (no
  behaviour change to the recipe page) and reused it inline — the expanded sheet now shows **writing → full
  recipe → failed-fallback** (preview pills), the wife's during-review read. Sheet tracks the expanded meal
  by id (live), so a recipe finishing hydration flips writing→full in place.
- **`recipe-generate` E2E fixture** added to the mock (`doGenerate`) so the walker firing in Plan review
  doesn't error the suite.
- **`recipe.get` alignment** (open-questions #3): kept it returning `null` and **codified the convention** —
  *point-read queries return `null`; mutations throw `NOT_FOUND`* — which is the right shape for the meal
  sheet's optional recipe fetch (graceful fallback, not a query error).

### Verification
- Gauntlet green: lint, typecheck, **185 unit** (+9). **30/30 Plan E2E** stay green with the walker firing
  live in review (proves the fixture + non-disruptive cache-patch). High-effort blast-radius review run on the
  diff: one real fix applied (past-slot hydration), two low items left as documented-acceptable (a slot stuck
  in DB `hydrating` from a crashed session waits for the Slice-B confirm-sweep; a transient status revert that
  self-heals on invalidate).
- **Not yet run on the real model** — hydration quality (does the generated recipe match the concept) is a
  wrap-time real-gen check, like 1C's chip/variety gate.

### Next
Slice B — `plan.confirm` creates the pending list, `grocery.generate` (sweep→normalize→aggregate→write), the
new `ingredient-normalize` task, and the pure deterministic aggregator with the under-merge rule.

---

## Session 22 — 2026-07-20 (1D reconciled; build started — Slice 0 + Slice A schema/invalidation)

### What happened
- **Reconciled two 1D plans.** Griffin had forgotten he'd already planned 1D (the LOCKED, more-thorough
  `~/.claude/plans/resume-meal-app-sorted-reddy.md` — 4 decision rounds + system-architect + ux-design-critic,
  held pending the new design workflow) when S21 re-derived a thinner one. The conflict was one axis:
  **when recipes hydrate.** Resolved to **plan-time hydration** (background during plan review — the wife
  reads full recipe detail while evaluating; confirm is near-instant) over confirm-time expand. sorted-reddy
  adopted as the base. New authoritative plan: **`~/.claude/plans/rippling-herding-glacier.md`**.
- **Imported the finished Groceries design from Claude Design** (projectId `8bc73bfa-9683-4b44-ab06-40da9ec78590`,
  `Groceries.dc.html`, saved to `docs/design/surfaces/groceries/imported.dc.html`). Resolved decisions:
  **merge-review = inline + under-merge** (uncertain merges shown inline, no forced action; aggregator errs
  toward NOT merging genuinely-different items); **one-zone check-off** (checked items drop to a bottom "GOT IT"
  zone); **Grouped↔manual reorder** + **Talk-to-Chef grocery sheet** (secondary NL add) adopted into 1D.
  **Trimmed out of 1D:** mid-week resync + its ack pill + `mergeOverrides`, and bespoke empty/error states.
- **Slice 0 done — docs reconciled** to plan-time architecture: rewrote decisions.md, scope-1D.md,
  brief.md→as-built, scope-v1 changelog, resolved open-questions #1 (free-form add).
- **Slice A started — schema + invalidation (green, committed `3101fca`):** schema deltas across
  plans/recipes/grocery + **migration 0004 applied** (all 8 columns verified). Fixed the latent
  `toSlotValues` stale-recipe bug in `plan.modify` (changed meal → null `recipeId` + `recipeStatus:"stale"`;
  removed → `none`) + regression test. Typecheck + lint + 177 unit tests green.
- **Infra gotcha:** the Supabase project was **paused** (free-tier inactivity) — resume in the dashboard
  before DB work; migrations need the env loaded (`set -a; . ./.env.local`) and use `npm run db:migrate`.

### Next
- **Finish Slice A** (the meatier half): `plan.hydrateSlot` mutation, the day-1-first client hydration
  walker in Plan review, `RecipeView` extraction from `recipe-detail.tsx` + the meal-sheet recipe upgrade,
  the `recipe-generate` E2E fixture, and the `recipe.get` null-vs-NOT_FOUND alignment — then the existing
  30 Plan E2E specs must stay green (hydration touches Plan review).

## Session 21 — 2026-07-19 (Claude Design workflow refined from FFOS learnings)

### What happened
- Griffin has been running Claude Design in FFOS and it got ahead of meal-app's setup. Pulled
  FFOS's canonical design docs (`design-workflow.md`, `PROJECT-CONTEXT.md`) and ported the proven
  pieces back — meal-app was the origin, but FFOS battle-tested the mechanics.
- **Round-trip SOLVED (the open item from S20):** `import-claude-design-from-url` REJECTS the
  pasted `claude.ai/design` app URL (Cloudflare-gated, wants a raw claudeusercontent.com bundle).
  Working method = `DesignSync.get_file(projectId parsed from the URL, path="<name>.dc.html", +→space)`
  → extract `content` → save to the surface folder. Fixed the wrong primary in design-workflow.md.
- **Structure = ONE plain app project** (Griffin's instinct, FFOS-proven): one plain-type Claude
  Design project for the whole app, GitHub-connected, carrying PROJECT-CONTEXT + all design chats
  as accruing memory. NOT per-screen; surfaces separated on the Claude Code side under
  `docs/design/surfaces/<surface>/`. The separate DesignSync design-system project (S20) is now
  dormant/optional — "we don't need that."
- **New: `docs/design/PROJECT-CONTEXT.md`** — the read-me-first product+tokens distillation. Captures
  a real difference: meal-app HAS a bespoke glass system worth protecting (unlike FFOS's near-stock
  shadcn), so its context is richer/more prescriptive.
- **Answered Griffin's design-system question:** NOT baked, deliberately — real vocabulary today but
  the deliberate consolidation is the 1F pass; the Claude Design loop is the living venue to evolve
  it, PROJECT-CONTEXT is the living token pin.
- Rewrote design-workflow.md; set up `docs/design/surfaces/`; updated both CLAUDE.md pointers,
  decisions.md (S21 refinement), the recall memory, and the 1D kickoff.

### Verification
- Docs-only; no product code. Round-trip mechanic is FFOS-verified. Griffin's one-time setup (create
  app project + GitHub connector + paste PROJECT-CONTEXT) is staged in whats-next; the loop gets
  exercised for real at 1D Groceries.

## Session 20 — 2026-07-13 (Claude Design adopted as default design partner)

### What happened
- Evaluated Claude Design (Anthropic Labs, launched 2026-04-17) vs the Figma Make loop and adopted it
  as the default design partner. Rationale: the design system lives in CODE, which Claude Design reads
  directly, collapsing the Figma 4-hop dance to 1 hop; no designer on the team, so Figma's pixel tools
  were unused cost. Decision logged in decisions.md.
- Built the design workflow: `docs/design/design-workflow.md` (roles, the "always offer a design pass"
  gate, per-pass loop, fallback ladder, 1F boundary). Built an 8-card DS bundle (`docs/design/system/`)
  from shipped tokens and pushed it to a Claude Design design-system project via the `DesignSync` tool.
  (Both the bundle-push approach and the round-trip were refined in S21 — see above.)
- Retired the Figma operating model everywhere it was a live instruction: rewrote the ux-design-critic
  agent (global) to Claude-Design-first, reframed Guidelines.md + brief headers, updated both CLAUDE.md
  files, annotated the old Figma decision + master-plan section as superseded, added a global pointer +
  recall memory. Figma MCP kept as a dormant escape hatch.
- The design-pass gate (Griffin's directive): whenever work is visual, OFFER a pass with a
  recommendation + what it buys + where returns diminish; never silent-skip, never auto-run.

### Verification
- Docs/agent-only. Bundle pushed + verified via `DesignSync.list_files`; agent frontmatter validated.
- Left open (→ answered S21): the design→code round-trip channel, and the project-structure model.

## Session 19 — 2026-07-10 (Release-scope system, master-plan restore, 1C closed)

*Continued directly from S18 (same day); split here because the work shifted from
feedback-triage to the release-level scope system + phase close.*

### What happened
- **Griffin's part-2 visibility ask:** he wanted a level above the phase doc — a scope
  contract for the whole first release, opened every session, plus an explicit Linear-vs-files
  decision. Confirmed via AskUserQuestion: **file-based hub-and-spoke** (Linear deferred with
  named graduation triggers) and **R1 boundary = solo-user MVP** (S9 cuts — sharing UI,
  realtime, cook mode → V1.5 — confirmed; household infra stays).
- **Built `docs/scope-v1.md`** — the Release 1 hub: phase spine 1A–1F w/ milestones + dates,
  per-phase feature checklists, release DoD, explicit out-of-scope table, post-MVP gate +
  V1.5 preview, change log. `scope-1C.md` reframed as its spoke. Session ritual v2 in
  CLAUDE.md: every session opens with a ≤6-line scope check (release position, roadmap
  position on the V1→V4 arc, deltas, open calls) linking the hub; anti-sprawl cadence (hub
  flips on status changes only, phase docs carry churn). Two decisions logged.
- **Restored 4 deleted plan files** from `~/.claude/plans/` (accidental working-tree
  deletions): meal-app master plan (`purrfect-hatching-ladybug.md`), FFOS master plan,
  2 Uber prep files. The Phase-1 architecture plan (`...starfish.md`) was **unrecoverable**
  (never committed) — its 1A–1F skeleton survives in this changelog (S9) and its scope role
  is now absorbed by `scope-v1.md`. `plans/README.md` marks it LOST. Master plan reconciled
  with a dated R1-boundary note + committed/pushed to the `~/.claude` repo.
- **Closed Phase 1C.** Verified the S18 chip/variety prompt fixes on the REAL model
  (throwaway `tsx` script, gpt-4.1-mini, 3 requests incl. the "I want to grill" case that
  likely drove the 7×-grill week): **100% verb-first imperative chips** (attributes correctly
  landed in tags, not chips), **7/7 distinct dish forms** every week, grilling correctly
  localized to the weekend on the grill request. Both open 1C quality items (12/13) → ✅.
  scope-1C exit criteria met; scope-v1 flipped 1C ✅ / 1D next (3 of 6 phases done). Script
  deleted after judging (not wired into the suite; it hits the real API).
- **Decided 1D approach:** design LIVE, not Figma (Groceries is a solved genre; the hard
  decisions are merge behavior + data flow; design-system polish is 1F). 1D kickoff staged
  as a plan-mode session — see whats-next.

### Verification
- Real-model plan-quality check passed (see above). Unit 176/176, E2E 30/30 unchanged
  (no product code touched this half — prompt + docs only; the prompt change was S18).
- Both repos pushed to main: meal-app `e631714`, `~/.claude` `9436d45`.

### Next
- **Plan-mode kickoff of Phase 1D (Groceries)** in a fresh session. Prompt in whats-next.

## Session 18 — 2026-07-10 (Plan-tab feedback triage, part 1 + scope visibility system)

### What happened
- **Griffin's Plan-tab feedback pass began** (mid-week state, live plan). Batch triaged per the S17 plan: bug/quality → fixed now; product → logged; nothing built untriaged.
- **Fixed: lowercase day in user-facing prose (bug).** "Reworking sunday's dinner…" and the scoped-chat headline "Change sunday's dinner" — `workingLabel()`/`chatHeadline` lowercased the ALL-CAPS `dayName`. New `dayTitle()` helper renders the proper noun ("Sunday"). The unit test had masked it by feeding title-case fixtures; factory now uses realistic ALL-CAPS input (comment explains the masking), and M1's E2E assertion pins the exact copy.
- **Fixed: chip quality (prompt hardening).** Griffin's fresh plan had attribute chips ("plant-based", "light", "iron-rich") — confirming the S15 open question: gpt-4.1-mini drifts despite imperative examples. Deliberate prompt change (chef-system.ts): chips must be verb-first ACTIONS; bare attributes banned with wrong-examples; never offer a quality the dish already has; modify titles never echo the request wording (the "Iron-Rich Grilled Steak Salad" failure). Prompt tests pin all three rules. Verifies on fresh generations, not E2E.
- **Logged as product (not built):** expanded-card structural action model (move day / servings / cook now / grocery — matches the Figma State-5 brief), move-a-meal-to-another-day (Griffin deferred), and a NEW finding: **generation variety miss** — Griffin's week was 7× "Grilled ___ Salad" despite the variety rule. All in idea-backlog Incoming.
- **Built the missing scope layer.** Griffin flagged a visibility gap: roadmap (too coarse) + whats-next (too granular) with nothing showing the comprehensive milestone picture. Created **`docs/scope-1C.md`** — milestone goal, definition of done, 13 in-scope features w/ acceptance criteria + status, explicit out-of-scope table, open questions, scope change log. Session protocol amended (CLAUDE.md): every session opens with a scope check and closes by updating the scope doc. Chose files over Linear (two-person shop; Claude reads docs every session; Linear is the graduation path). Decision logged.
- **Discovered + flagged: 4 plan files accidentally deleted from `~/.claude/plans/`** — including the meal-app master plan (`purrfect-hatching-ladybug.md`) and the FFOS master plan. Uncommitted working-tree deletions in the `~/.claude` git repo — fully recoverable (`git restore`), but the restore touches files outside this project so it's parked for Griffin's go-ahead. Explains part of the visibility gap (CLAUDE.md's strategy-layer references were dead links).
- **E2E robustness:** first full run flaked on M3 (modify resolved >6s under machine load — build + gauntlet + dev server competing; M4 passed at 5.7s of a 6s budget). Rerun green. Bumped modify-resolution timeouts 6s→10s (assertions unchanged; mock latency isn't the thing under test).

### Verification
- Gauntlet green: lint + typecheck + **176/176** unit tests (+3: dayTitle, chip rule, title guard).
- Full E2E: 29 passed + M3 machine-load flake → modify spec rerun 8/8 green → final full-suite rerun kicked off post-timeout-bump (result in whats-next).

### Still open from Griffin's batch
- Feedback pass is PART 1 — Griffin said "everything I see wrong with it"; more batches may follow.
- Chip/variety quality (scope items 12–13) verify on fresh generations — needs a real regeneration to judge.
- Open scope calls for Griffin in scope-1C.md: does chip quality gate 1C exit? Pull pill-auto-send into 1C?

## Session 17 — 2026-07-09 (E2E testing harness — Phase 1)

### What happened
- Started building the Playwright E2E harness per `docs/plans/spike-e2e-testing-harness.md` to close the "ships UI Claude can't click-verify" gap.
- **AI mock seam (server-side, at the model layer).** Rejected the spike's `page.route` leaning: intercepting `/api/plan/stream` in the browser leaves the DB stale (client refetches `plan.current` after streaming), and intercepting tRPC means forging superjson batches. Instead, `getModel()` (`src/server/ai/config.ts`) returns a `MockLanguageModelV3` from `ai/test` when `E2E_AI_MOCK=1`. The full real pipeline (retry, streamObject parse, Zod validation, `persistPlan`, tRPC serialization, invalidation) runs against canned fixtures — verified end-to-end via a throwaway script (scoped/whole-week/eating-out modify + 7-meal generation + FAIL directive all correct).
- Fixtures + `[E2E:*]` token grammar in `src/server/ai/providers/e2e-mock-fixtures.ts` (FAIL → throw, SLOW=ms → latency, "eating out" → day removal, title-match → scoped rework, else → whole-week rework). Generation returns 7 "Fresh …" meals; seeds will use "Seeded …" so replace-on-generate is assertable.
- Double-gated (`E2E_AI_MOCK==="1" && !VERCEL`; flag lives only in playwright.config webServer.env). Relaxed the in-memory AI rate limit under the mock flag only (`src/server/ratelimit.ts`).
- Scaffolding: `@playwright/test` + chromium, `tests/e2e/{harness,app,specs}` tree, `test:e2e` scripts, vitest excludes `tests/e2e/**`, `.gitignore` for playwright artifacts + `.auth/`.
- **Reusable core + app layer.** `tests/e2e/harness/` is generic and copyable (session minting, seed-client, config factory, `README.md` + `ai-mock-pattern.md` porting recipe). `tests/e2e/app/` + `tests/e2e/specs/` are meal-app-specific. Porting to FFOS/Leila = copy `harness/`, write the app layer.
- **Auth bypass** mints a REAL Supabase session (admin createUser → password sign-in → replay through `@supabase/ssr` for byte-identical cookies → Playwright storageState) and bootstraps users/household/membership. Passes the proxy + the layout's real `getClaims()`. No Supabase dashboard toggle was needed (Email provider already on).
- **Seeding** (`tests/e2e/app/seed.ts`): 5 named states via Drizzle, with a bulletproof safety guard (refuses any household not named "E2E Test Kitchen" with the test user as sole member; verified it throws on a bogus id). Runs against the real Supabase project, isolated to the guarded test household.
- **Server prod build for the E2E server** (`next build && next start`), not `next dev`: Next 16 blocks a second `next dev` from the same dir. `E2E_REUSE_BUILD=1` skips rebuild for fast iteration.
- **Debug HUD** (`useDebugPanel` + `DebugHud`): dev-only, toggleable (Cmd/Ctrl+Shift+D or 🐛), copyable JSON snapshot of live Plan-tab state incl. todayUTC-vs-local. Gated dev / `NEXT_PUBLIC_DEBUG_HUD` / `localStorage debug-hud=1`; off by default (prod-safe).
- **Mock bug the specs caught:** initial routing read the whole prompt, but the chef *system prompt* literally contains "<user_request>" and "eating out", so every scoped modify mis-routed to the eating-out branch. Fixed to read only the user message.
- **Wired the suite into the workflow** so future sessions invoke it automatically: CLAUDE.md gained an "E2E test suite — when to run it" section + Auto-Invoke entries, and `.claude/rules/plan-e2e.md` (globs on Plan-tab files) nudges `npm run test:e2e` + spec extension whenever Plan-tab code is edited. Deliberately NOT in the per-commit hook (needs a build, minutes-slow, Plan-tab-only) — it's a relevant-change + wrap-time gate; the fast gauntlet stays the commit gate.

### Specs authored (docs/test-plan.md 1:1) — 23 passing, 1 finding, 2 clean runs
- **D1-D7 drawer**: D1-D6 pass; **D3 (the two-drawer pointer-lockup regression) is verified sound**. D4 drag-to-dismiss passes (not flaky). **D7 FINDING** — background DOES scroll while a sheet is open (the S16 "scrim blocks it" note is wrong; `modal={false}+noBodyStyles` means nothing blocks window scroll). Marked `test.fixme` pending Griffin's call.
- **RG1-RG5 regenerate (the Test 8 V1 blocker)**: all pass, incl. RG4 true one-active-plan replacement through the REAL persist pipeline and RG5 the stale-modify token guard.
- **M1-M7 modify affordance**: all pass — in-place working, sheet-stays-open, scope anchor, whole-week ack pill + scroll-to, bottom-anchored feedback, single active modify, eating-out day.

### Verification
- Full E2E suite: **23 passed, 1 skipped (D7 finding)** across two consecutive clean runs; the `[e2e-mock]` banner confirms zero real OpenAI calls.
- Gauntlet green with mock inert: lint + typecheck + 173/173 unit tests pass (mock never activates without the flag).

### Open for Griffin
- **D7 product call**: accept background-scroll behind a sheet, or re-lock it (via scrim `onWheel`/`onTouchMove` preventDefault — does not reintroduce the D3 body pointer-events lockup).
- Ready for his functional review: the Plan-tab mechanics are now machine-verified; his pass shrinks to **taste** (does the generated plan read well, do chips sound like natural imperatives, does the affordance *feel* right) rather than clicking every path.
- This commit also carried two pre-existing uncommitted working-tree tweaks not authored this session (cursor affordances: `globals.css` button cursor + drawer handle `cursor-grab`).

### Session 17 (continued) — live manual pass + E/X specs + polish call
Ran in parallel to the harness build (same working dir — the harness's `git add` swept the two tweaks below into its commits; noted the coordination hazard: use separate worktrees next time).
- **Live manual QA pass caught two real bugs the harness had shipped past, both fixed + committed + redeployed to prod:**
  1. **D2 click-outside was DEAD in the browser** — the scrim inherited `pointer-events:none` from vaul's `modal={false}` portal. Fixed with `pointer-events-auto` on the scrim (`ui/drawer.tsx`). The harness's faithful D2 test was green only because the fix landed in the same commit as the scaffold, so it never saw the broken code — but the bug reached prod. Lesson captured: the harness guards regressions; a periodic *live* pass still catches real-vs-headless gaps the harness (which didn't exist at S16 ship) let through.
  2. **No pointer cursor on any button** (Tailwind v4 dropped the default) — fixed app-wide with a base `button { cursor: pointer }` rule + `cursor-grab` on the drawer handle.
- **Prod redeployed** (`vercel deploy --prod`) — was stuck on the S16 build with the broken click-outside; meal-app-swart.vercel.app now current + smoke-tested.
- **E1-E4 (elapsed) + X1-X2 (error/retry) automated**, and **D7 resolved** — Griffin accepted background-scroll + click-outside both; D7 flipped from `test.fixme` to asserting the page is NOT scroll-locked. Full suite now **30 passing, 0 findings**. Corrected the (wrong) S16 "background-scroll sacrificed" decision — it never was; both behaviors coexist.
- **Decision logged:** design polish is a dedicated design-SYSTEM pass AFTER the V1 flow is complete + validated, not per-screen now (sunk-cost anchoring, system-built-once, value-before-premium). Quality bugs still fixed inline. Feedback triaged bug/quality-now vs polish-later.
- **Next session:** Griffin's overall Plan-tab (1C) feedback → triage. See whats-next "Next session."


## Session 1 — 2026-03-28

### What happened
- Griffin shared full product vision and feature brain dump for a meal management app
- Reviewed two existing research documents in `/reference/`:
  - `Meal Management Cooking App Deep Research and Competitor Synthesis .md` — competitor analysis of 9+ apps (NYT Cooking, Paprika, AnyList, Samsung Food, Cooklist, Mealime, SideChef, Eat This Much, PlateJoy)
  - `grocery-notes-research.md` — academic/behavioral research on grocery shopping and meal planning
- Consulted UX designer on missing user problems, interaction model, form factors, and risks
- Consulted planning agent on phased roadmap and technical architecture
- Built the full phased roadmap (V1 through V4)
- Generated 10 additional feature ideas beyond Griffin's brain dump

### Decisions made
- **Primary user for V1**: Solo health-conscious adult (Griffin's profile)
- **Phasing confirmed**: V1 (core loop) -> V1.5 (pantry + sharing) -> V2 (ordering + photo import) -> V3 (health coaching) -> V4 (native mobile)
- **AI interaction baseline**: Contextual AI everywhere (inline, not a separate tab)
- **Working name**: "meal-app" (branding TBD)
- **Tech stack**: Next.js + tRPC + Supabase + Drizzle + shadcn/ui + Tailwind + Claude API + Vercel
- **Architecture**: API-first via tRPC (not Server Actions) to support future iOS/Android clients

### Open questions raised
- AI interaction model needs deeper exploration: when a user clicks "Edit" on a recipe, does it open a chat thread, a wizard, or something hybrid?
- Function Health-style dedicated AI tab vs. contextual-only — to be explored further with UX designer

### Key insights from research
- "10 minutes from no idea to grocery list" is the validated success criterion
- Grocery list is the biggest retention lever AND most fragile trust surface
- Pantry setup friction kills pantry-aware apps — must be progressive (binary have/don't have first)
- Cart integration failures are disproportionately damaging to trust — always maintain manual list as source of truth
- PlateJoy discontinued July 2025 — displaced user cohort is an opportunity

---

## Session 1 (continued) — 2026-03-28

### What happened
- Griffin asked for deep research on two critical technical questions:
  1. How good are LLMs at recipe generation/modification? Do we need RAG?
  2. Are grocery integrations open/accessible?
- Researched both topics thoroughly
- Created `docs/technical-research.md` with full findings

### Key findings: Recipe AI
- LLMs are genuinely strong at recipe tasks for everyday home cooking — no RAG needed for V1
- The system prompt is the secret sauce: encode dietary rules, safety guardrails, output format
- Baking is the one danger zone (wrong proportions). Savory cooking is forgiving.
- USDA FoodData Central API (free) covers nutrition data
- Hybrid URL parsing: `recipe-scrapers` library (~70% of sites) + Claude fallback = near 100% coverage
- Cost: ~$0.01-0.05 per recipe generation, ~$0.005-0.02 per URL parse

### Key findings: Grocery Integrations
- **Kroger** is the only major retailer with a genuinely open, self-serve cart API
- **Instacart** requires a business partnership — not accessible to small apps without traction
- **Walmart, Amazon Fresh** — no public APIs at all
- Deep links (pre-filled search URLs) are the no-partnership fallback
- Recommendation: V1 has no integration (just a great list), V2 adds Kroger API + deep links, pursue Instacart partnership when traction exists

### Discussions
- Griffin wants to think carefully about recipe AI credibility before pitching this as "expert recipe generation"
- Integration constraints inform phasing — V1 should not depend on grocery partnerships

### LLM cost analysis added
- Researched pricing across Anthropic, OpenAI, Google, open source, and smaller providers
- Recommendation: tiered model routing (cheap models for routine tasks, premium for complex)
- GPT-4.1-mini identified as likely production workhorse ($0.0015/recipe) — best structured output guarantees
- Claude better for complex dietary reasoning but 5-10x more expensive for routine tasks
- Gemini 2.5 Flash free tier recommended for prototyping (zero cost)
- Google for Startups offers up to $350K in credits — worth pursuing
- LLM costs are not the biggest expense: ~$150/mo at 100K requests. Hosting and database cost more.
- Decision deferred to prototyping — will benchmark quality across providers on actual recipe tasks

### Phase 0 redefined as Discovery & Design
Griffin clarified: no code should be written until we've done proper discovery work — competitive deep-dives, design exploration, wireframing in Figma, resolving open questions. What was "Phase 0: Foundation Sprint" is now "Phase 1: Infrastructure Sprint," and there's a new "Phase 0: Discovery & Design" that gates everything.

### Figma operating model researched and documented
- Figma Make: AI-powered prompt-to-prototype tool. Generates coded prototypes from text prompts. 3,000 credits/month on Pro.
- Figma MCP Server: bridges Claude Code and Figma. Claude Code can read designs and push content to canvases.
- Operating model: Claude Code drafts feature specs and Figma Make prompts, Griffin generates in Figma Make, reviews and iterates, Claude Code reads approved designs via MCP to inform implementation.
- Setup: `claude plugin install figma@claude-plugins-official`, authenticate, need Full seat on Figma Pro.
- Key limitation: no automatic sync — each direction requires manual initiation.

---

## Session 3 — 2026-03-30

### What happened
- Deep debate on core interaction model. Explored chat-first → pushed back on it (speed, repeat-use tedium) → landed on "AI generates the UI" model.
- Defined the "personal chef" metaphor as the core product personality.
- Resolved feedback collection approach: blended model (implicit behavioral signals as foundation + lightweight explicit check-ins framed as "personal chef checking in").
- Established V1 framing: the personal chef on their first day — asks questions, learns fast, gets smarter every week.
- Griffin requested: no sycophancy. Challenge ideas, pressure-test, debate first, then execute. Saved to memory.
- Updated master plan to reflect new interaction model across all phases (V1 features significantly revised).
- Set up session-handoff protocol: when Griffin says "resume meal app," read docs and give exact status.

### Decisions made
- **AI interaction model: "AI generates the UI"** — dynamic personalized proposals, not chat-first, not static. User reacts/tweaks/confirms.
- **Feedback model: blended implicit + explicit** — behavioral signals as foundation, lightweight check-ins as accelerator. "Personal chef checking in" framing.
- **V1 = personal chef on day one** — asks questions, makes good general suggestions based on limited knowledge, learns fast.
- **Working principle: no sycophancy** — Claude should challenge Griffin's ideas and pressure-test before agreeing.

### Key insight
The "AI generates the UI" model is the core differentiator. No competitor does this. Every meal planning app uses static UIs. This is harder to build but is the actual product bet.

---

### Master plan approved and Phase 0 launched (2026-03-29)
- Griffin approved the full master plan
- Phase 0: Discovery & Product Shaping is now active
- Household sharing (dual account ownership) moved from V1.5 into V1
- "Nail before expanding" added as core product principle
- UX agent template created at `docs/ux-agent-template.md`
- Discovery log created at `docs/discovery-log.md`
- Tooling decision: no new tools needed for Phase 0. Linear recommended at start of Phase 1.
- Griffin noted he may want to move to native app development sooner than planned — parked for now.

---

## Session 5 — 2026-04-05

### What happened
- Resumed Phase 0 competitive walkthroughs
- Deep walkthrough of **Cooklist** — Griffin's most extensive competitive analysis yet. Walked through the entire app end-to-end: login, pantry setup, AI meal plan generation (voice input), plan management, shopping list sync, retailer checkout (Target), recipe browsing, Cook tab, ingredient pages, profile/settings.
- Griffin took 22 screenshots saved to `reference/competitor-videos/Cooklist/`
- Key framing: "What I'm doing is building an AI-first Cooklist"

### Key observations
- **Design sophistication is a massive competitive opportunity** — Cooklist (and the broader competitive set) looks "cheesy," "amateurish," "clunky." Fonts, graphics, icons, celebration animations, logo — all feel childish. The bar is genuinely low. A clean, modern, sophisticated UI is a real differentiator, not just personal taste.
- **Voice-first input validated** — Cooklist's dictation-based plan creation ("tell me what you want to eat this week") is the closest thing in market to our interaction model. Right instinct, poor execution (no confirmation, no follow-up questions, no typing fallback).
- **Hard-coded plans are the old paradigm** — Each plan as a distinct artifact with its own settings is outdated. Our dynamic, continuous, system-aware approach is the right bet.
- **Forced pantry setup kills conversion** — Caused Griffin to literally bounce from the app on first use.
- **4-minute plan generation is unacceptable** — Speed is critical. Background processing with app-wide progress indicator needed.
- **Manual sync steps shouldn't exist** — Plan-to-shopping-list should be automatic.
- **Recipe discovery model is an open question** — Do we need a recipe catalog, or is AI-generated + external import sufficient?

### New open questions raised
- Recipe discovery: built-in catalog vs. AI-generated + import?
- Pantry as dedicated tab vs. background intelligence layer?
- Retailer account linking: setup time vs. checkout time?

### New ideas captured
- Ingredient reuse optimization in planning
- Multi-provider auth (Google SSO, OTP)
- "Scan your fridge" AI pantry import
- Ingredient detail pages (cross-referencing)
- In-app guided tours
- Pre-authenticated store accounts
- Grocery spend tracking
- App review prompt timing research
- Macro tracking as future extension
- Design sophistication as competitive moat

### Design Direction Deep-Dive (later in Session 5)
Griffin reviewed 6 apps for design inspiration, building from "least favorite" to "most favorite":

**Design references ranked:**
1. **Crouton** — #1 reference. "If you asked me to pick one app to emulate, Crouton." MVP visual baseline. Liquid glass, dark mode, brilliant cook mode (smart text with auto-detected timers, tappable ingredients). Take Crouton's design + add AI.
2. **Flighty** — Aspirational quality bar. iOS liquid glass, bottom card modality, "rich serious dense but airy and usable."
3. **Robinhood** — Geometric/diagrammy illustration style, bold limited-palette colors on black, 4-tab IA with depth.
4. **Mela** — One bold accent color + dark mode + whitespace = premium recipe app. Minimalism proof point.
5. **Function Health** — Interaction model reference (static UI → AI chat for creation). Structured objects inline in chat. Protocol builder progress steps.

**Key design principles locked:**
- Dark mode first (non-negotiable)
- iOS Liquid Glass / glass-morphism aesthetic
- Limited color palette (1-2 accent colors)
- Bold typography hierarchy with whitespace
- No cheesy graphics, emojis, or celebration animations
- Smart inline features (Crouton's tappable recipe text model)
- Bottom card/sheet modality for AI interaction

**Recipe discovery behavior confirmed:**
- Griffin does NOT browse recipe catalogs
- Uses ChatGPT for generation, NYT for specific search, wife shares from Instagram
- Validates Option C: AI-powered discovery that feels like browsing, not a static catalog
- Share-menu integration (iOS share target) is critical for Instagram recipe capture

**Ingredient reuse**: Soft optimization only. AI should consider it if ingredients won't be fully used in one recipe, but don't constrain meal variety.

**V1 scope confirmed**: Narrow scope validated. Cooklist's breadth makes Griffin feel more confident about focusing.

**Platform question raised**: If the design direction is fundamentally iOS-native (liquid glass), should we reconsider web-first? Open question with significant implications.

---

## Session 6 — 2026-04-12

### What happened
- Resolved information architecture — the last major blocker before screen-level design
- Deep analysis of IA options: Plan-Centric (A), Home Hub (B), Minimal 3-tab (C), Plan+List Merged (D)
- Stress-tested Option A against every feature in V1 through V4 plus all unphased ideas
- Griffin confirmed Option A after reviewing the analysis

### Decisions made
- **Information Architecture: Plan | Recipes | Groceries | You** — Four tabs, four nouns. Plan is the landing screen and the primary AI surface. No dedicated Home tab (junk-drawer risk). AI input bar contextual per screen, general on Plan. Pantry lives inside Groceries. Cook mode is an immersive overlay from recipe detail, not a tab. Stress-tested through V4 — no feature requires restructuring.

### Key insights
- "Home" tabs become catch-alls over time — every new feature wants real estate. Plan bounds scope clearly.
- Pantry is the flip side of Groceries ("what I have" vs. "what I need") — they belong together.
- AI discoverability solved by making Plan's input bar the general "ask your chef" surface, with rotating placeholder text and suggestion pills that show diverse query types.
- Cook mode is Crouton-style: an immersive overlay, not a navigation destination.

---

### Project management infrastructure built
Griffin requested formal systems to ensure long-running multi-phase build doesn't lose context. Created:
- `docs/idea-backlog.md` — Master backlog of ALL ideas with phase assignment, source, and status. Nothing gets deleted. New ideas go to "Incoming" immediately.
- `docs/plans/README.md` — Index of all plans at three levels: phase plans, feature plans, spike/research plans
- `docs/plans/` directory — For individual plan files as we go deeper
- Moved research docs into `meal-app/reference/` for explicit project context
- Updated `CLAUDE.md` with comprehensive session protocol:
  - Start-of-session context restoration
  - End-of-session updates across all tracking docs
  - Rules for capturing new ideas immediately during any session
  - Rules for noting architecture decisions that affect future phases
  - Rules for referencing research when making decisions
  - Plan hierarchy explanation (phase → feature → spike)

---

## Session 7 — 2026-05-24 to 2026-05-26

### What happened
- Resumed after 6-week gap. Kicked off design phase (Phase 0D).
- **Wrote `docs/design/Guidelines.md`** — the durable Figma Make bridge document. Consolidates design direction, IA, interaction model, component patterns, AI surface conventions, voice/personality, anti-patterns, and reference apps. Designed to be pasted into Make's Guidelines tab and reused across every generation session.
- **Wrote `docs/design/brief-plan.md`** — per-screen brief for the Plan tab. Specifies two states: State A (Sunday morning, fresh week proposal) and State B (Wednesday evening, mid-week). Includes specific sample meal content, interaction details, and generation guidance for Make.
- **Researched Figma Make best practices** — model selection (Sonnet 4.6 recommended for iteration, Opus for polish), attaching reference screenshots, credit management, hybrid workflow (Make → copy to Design → manual iteration → back to Make).
- **Griffin generated first Plan screen prototypes in Figma Make** — Sunday and Wednesday views. Figma file: `SvN6dPjWCxvc4qnaZfKNmc` ("meal-app-v1"). Griffin described them as "decent start, by no means complete."
- **Deep dive on AI interaction surface** — Griffin flagged that the persistent chat bar / sparkle button pattern is overplayed. Explored five alternative paradigms. Proposed "Content IS the Conversation" layered model (see `docs/design/ai-surface-analysis.md`).
- **Sent ChatGPT deep research prompt** — to gather industry examples of innovative AI-native UIs beyond chat bars (prompt saved at `docs/design/chatgpt-research-prompt.md`). Research pending.

### Key design files created
- `docs/design/Guidelines.md` — Figma Make bridge doc (durable, reused every session)
- `docs/design/brief-plan.md` — Plan screen generation brief
- `docs/design/ai-surface-analysis.md` — Five paradigms evaluated + proposed "Content IS the Conversation" direction
- `docs/design/chatgpt-research-prompt.md` — Deep research prompt for AI-native UI patterns

### Design direction proposed (NOT yet decided)
- **"Content IS the Conversation"** — a layered interaction model:
  - Layer 1 (80%): Direct manipulation on cards (swipe left = show another, swipe right = confirm, tap = expand)
  - Layer 2 (15%): Tap the AI's rationale line on a card → it transforms into a contextual input for that card
  - Layer 3 (5%): Hero card rationale → global input for whole-plan changes
  - Voice as optional overlay, not primary
- **Griffin's reaction**: Likes the direction. Thinks removing ALL text input may be slightly too radical — wants some visible affordance. Wants to validate against industry research before committing.
- **Status**: PENDING — awaiting ChatGPT deep research results on AI-native UI patterns

### Decisions made
- None confirmed this session. The AI surface paradigm is under exploration, not decided.

### Open questions raised
- Is removing the persistent input bar too radical? Where's the middle ground?
- Does "tap the rationale to respond" have precedent in shipped products?
- How does first-time experience work when the AI has no history and needs to ask more questions?

### Figma MCP status
- NOT connected this session. Griffin is reconnecting MCP for next session so Claude can read Figma designs directly.

---

## Session 8 — 2026-05-26

### What happened
- Integrated ChatGPT deep research on AI-native UI paradigms beyond chat bars (stored at `reference/ai-native-design-research.md`)
- Converged on the AI interaction surface paradigm: "Content IS the Conversation" — a layered model with direct manipulation as primary (70%), "Talk to the Chef" free-form input as secondary (20%), and structured multi-turn clarification through option cards as tertiary (10%)
- Debated the role of free-form input vs. cards/swipe — resolved that free-form is first-class, not a fallback, because complex multi-constraint requests are genuinely faster via dictation
- Defined "familiar containers, alien intelligence" as the core design differentiation principle
- Defined the chef's voice running through the UI at three levels: plan-level summary, card-level rationale, change-level acknowledgment
- Updated Guidelines.md to reflect converged AI surface model (killed persistent input bar, added Talk to the Chef, contextual chips, option cards, chef-voice headers)
- Wrote briefs for 6 Plan tab states and generated all 6 in Figma Make
- Connected Figma MCP — Claude can now read designs directly
- Reviewed all 6 Figma states via MCP. Key surprises to preserve: "YOUR CHEF" label, Saturday "SUGGESTED" card pattern, ingredient pills as chips, inline Talk to Chef input adapting to mid-week context
- Defined card tap interaction model: tap opens expanded bottom sheet with recipe preview + AI-generated contextual actions (not a static menu)
- Resolved the review workflow: sticky bottom confirm bar appears when hero scrolls out of view
- Discussed Figma Make workflow, design fidelity expectations, and transition to code
- Established development workflow preferences: build autonomously, periodic check-ins, Codex QA at milestones, self-directed refactoring thinking

### Decisions made
- **AI interaction surface paradigm: "Content IS the Conversation"** — Layered model. 70% direct manipulation on cards, 20% "Talk to the Chef" free-form input, 10% structured option cards. Chef's voice woven through UI. No sparkle FAB, no persistent chat bar. Full details in `decisions.md`.
- **Card tap behavior**: Opens expanded bottom sheet with recipe preview + AI-generated contextual actions. Actions are situation-specific, not a static menu.
- **Review workflow**: "Looks good" on hero card for confident users + sticky bottom confirm bar for users who scroll through the full plan.
- **Design completeness**: 6 Plan tab states are sufficient to begin build. Other tabs (Recipes, Groceries, You) will use the same component vocabulary.
- **Development workflow**: Claude builds autonomously, Griffin checks in periodically. Codex QA at milestones. Self-directed refactoring.

### Design files created/updated
- `docs/design/Guidelines.md` — Updated for converged AI surface model
- `docs/design/brief-plan-states.md` — 6 state briefs for Plan tab
- `docs/design/prompt-state1-refinement.md` — Follow-up prompt for State 1 refinement
- `docs/design/ai-surface-analysis.md` — Updated with converged direction
- Figma file: `SvN6dPjWCxvc4qnaZfKNmc` ("Meal-App-Designs") — 6 Plan tab states generated in Figma Make

### What's next
- Deep systems architecture review (web → iOS transition, AI/LLM integration, scalability)
- Create a Phase 1 implementation plan
- Begin Phase 1 build

---

## Session 9 — 2026-05-26

### What happened
- **Full systems architecture review** — designed the complete architecture for V1 through V4
- **Phase 1 implementation plan created** — 6 build phases (~9 weeks total): Foundation → AI Core + Recipes → Plan Tab → Groceries → You Tab + Memory → Polish
- **Independent system architect review** — validated architecture, identified 6 operational gaps (image handling, AI error states, rate limiting, testing, observability, memory timing), all incorporated
- **Security audit** — OWASP Top 10 assessment, AI-specific security (prompt injection, SSRF, data leakage), privacy/compliance (GDPR/CCPA). Full security requirements by phase.
- **Eventing strategy designed** — PostHog selected (deferred install to Production Readiness), event taxonomy defined (30+ events across 8 categories), vendor abstraction layer planned
- **LLM integration architecture documented** — "structured output tool, not an agent" model with 12 specific touchpoints mapped
- **Quality infrastructure created** (parallel session) — pre-commit hooks, file-type rules, slash commands, engineering principles doc
- **Phasing principle established** — invest in things that can't be retrofitted (data model, auth, security, abstraction layers) in Phase 1. Defer production tooling (PostHog, Sentry, E2E tests) to Production Readiness phase.

### Decisions made
- **Project structure**: Single Next.js app, not monorepo. Clean `src/server/` separation for future mobile extraction.
- **Household sharing**: Infrastructure only in V1 (household_id everywhere). Full sharing UI deferred to V1.5.
- **Cook mode**: Deferred to V1.5. Data model supports it.
- **Timeline**: Ship when ready. No external deadline. ~9 weeks estimated.
- **Auth**: Google SSO + magic link from day one.
- **Analytics**: PostHog (decided, installed later). Vendor abstraction layer built in Phase 1.
- **Error tracking**: Sentry (decided, installed later).
- **LLM integration model**: Structured output tool, not an agent. Deterministic code always in control.
- **Memory system**: Structured preferences table + unstructured AI memory log. No vector store in V1.
- **Real-time**: Deferred to V1.5 (no Supabase Realtime until sharing ships).

### Plans created
- `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` — Systems Architecture & Phase 1 Plan (approved)

---

## Session 10 — 2026-05-27

### What happened
- **Phase 1A: Foundation Sprint — COMPLETED in one session**
- **Environment setup**: Git repo initialized, GitHub remote created (private: griffinyanny/meal-app), Supabase CLI installed via npm, all env vars configured
- **Project scaffold**: Next.js 16 + TypeScript + Tailwind v4 + Turbopack + shadcn/ui + tRPC v11 + Drizzle ORM + Supabase Auth + Vitest
- **Full database schema**: 11 tables across 5 domain files (households, recipes, plans, grocery, memory). All tables have household_id, created_at, updated_at per project rules.
- **RLS policies**: Created `is_household_member()` helper function and RLS policies on all 11 tables
- **tRPC API layer**: 4 routers (recipe, plan, grocery, user) with `protectedProcedure` middleware enforcing auth + household membership. Added `authedProcedure` for pre-onboarding operations.
- **Auth flow**: Google SSO via Supabase Auth, proxy (middleware) for session refresh and route protection, auth callback with open redirect protection
- **Auto-onboarding**: `user.ensureOnboarded` mutation creates user + household + membership records on first login. Griffin successfully logged in and records created.
- **App shell**: Phone form factor (430px), glass-morphism tab bar with safe area insets, 4 tab pages with placeholder content
- **Dark mode glass design system**: Custom CSS tokens (#0E0E10 background, #3A86FF accent), glass-surface/glass-sheet/glass-card utilities, shadcn/ui initialized
- **Vendor abstraction layers**: analytics.track() (console.log) and errorReporting.capture() (console.error) — ready for PostHog/Sentry plug-in later
- **Vercel deployment**: Deployed to production (https://meal-app-swart.vercel.app), env vars configured for all environments
- **Multi-perspective code review** (`/review`): 4 parallel sub-reviews (correctness, security, architecture, performance). Found and fixed:
  - CRITICAL: 4 authorization bypass bugs in grocery/plan routers (mutations without household ownership checks)
  - CRITICAL: `mealPlanSlots` and `groceryItems` missing `household_id` column
  - IMPORTANT: Duplicated grocery category enum (extracted to shared constant)
  - IMPORTANT: Missing Zod schemas for JSONB columns
  - IMPORTANT: `updatePreferences` race condition (converted to upsert)
  - IMPORTANT: `dietaryFramework` accepting arbitrary strings instead of defined enum
  - IMPORTANT: Login error handling, open redirect, safe area insets, tap target sizes
  - IMPORTANT: `householdSize`/`maxCookTime` stored as text instead of integer
- **Supabase new keys**: Researched and confirmed new publishable/secret keys are drop-in replacements for legacy anon/service_role keys
- **Next.js 16 proxy convention**: Renamed middleware.ts → proxy.ts with named `proxy` export per Next.js 16 deprecation
- **Lazy DB initialization**: Fixed build failure caused by eager postgres driver initialization at module scope

### Decisions made
- **Supabase new keys (publishable/secret)**: Use new keys, not legacy. Drop-in compatible with @supabase/ssr.
- **Database connection**: Transaction pooler (not direct or session). Required for serverless (Vercel). `prepare: false` already set.
- **Auto-onboarding approach**: `user.ensureOnboarded` mutation called via `OnboardGuard` client component on app layout mount. Creates user + household + membership if not exists. Full AI-guided onboarding deferred to Phase 1E.
- **Next.js 16 proxy**: Use `proxy.ts` with named `proxy` export (replaces deprecated `middleware.ts`).

### Milestone M1: ACHIEVED
- Deployed app, login works, tabs navigate, glass design system visible, database records created on login

### What's next
- Phase 1B: AI Core + Recipes

---

## Session 11 — 2026-05-27

### What happened
- **Phase 1B: AI Core + Recipes — built and shipped to working state. Milestone M2 achieved.**
- **AI service layer**: Provider abstraction on Vercel AI SDK v6 (`generateStructured`/`generateText`/`generateStream`), per-task model config, retry with classification, metadata logging. Decided to use AI SDK over a custom abstraction (validated against system-architect reasoning).
- **Personal chef system prompt**: static role + food-safety guardrails + output rules. Per-user context (dietary, dislikes, memories) passed separately.
- **Three AI pipelines**: recipe generation, URL parsing (SSRF-protected + Jina Reader fallback), modification (version chains). All structured-output + Zod-validated.
- **AI memory core** pulled forward from 1E (getChefContext/writeMemory).
- **Recipe tRPC router**: list, get, search, generate, importUrl, modify, favorite, delete — all household-scoped.
- **Recipes tab UI**: library grid, debounced search, generate/import dialogs, recipe detail with modify/favorite/delete, optimistic favorites, error/retry states.
- **Provider switch Gemini → OpenAI gpt-4.1-mini**: original Gemini key had depleted credits. GPT-4.1-mini was already the planned production workhorse, so switched primary (one-line config change). Adapter was already installed.
- **Ran `/review` (4-lens internal) + `/codex-review` (independent)** at the phase boundary. Fixed all findings across two rounds: SSRF hardening (DNS resolution + manual redirect re-validation), prompt-injection delimiters, moved user content out of system prompt into delimited user message, output bounds validation/sanitization before DB writes, retry classification via structured error fields, optimistic-update race fix, removed dead cursor pagination, error/retry UI states, nested-button hydration fix.
- **30 tests passing**, lint/typecheck/build all clean.

### Major debugging (resolved)
- **DB connection hung**: Supabase transaction pooler requires `ssl: "require"` in the postgres client (connection string had no sslmode param).
- **Dev server wouldn't load in browser (proxy deadlock)**: Next.js 16 `proxy.ts` calling `supabase.auth.getUser()` deadlocks after the first request in the long-lived Turbopack proxy runtime (accumulating auth-lock state). Fix: proxy now does fast cookie-presence routing only; real auth verification stays in tRPC `protectedProcedure`. (Compared against working FFOS setup to isolate.)
- **OpenAI strict structured output**: rejects Zod `.optional()` fields. Fix: AI schema uses `.nullable()`, normalizers convert to clean DB shape.
- **AllRecipes 403**: major recipe sites block server-side fetches (Cloudflare). Fix: Jina AI Reader fallback (free, headless-browser proxy) when direct fetch is blocked.

### Decisions made
- **AI provider abstraction: Vercel AI SDK v6** (not custom). Implements our exact interface; provider swap is config-only.
- **Primary LLM: OpenAI gpt-4.1-mini** for development (Gemini deferred; can route per-task later).
- **Recipe images: text-forward for V1** (recommended; no hero-image generation — defer to polish/V1.5).
- **Proxy does cookie-presence routing only** — real auth in tRPC. Avoids the Turbopack proxy deadlock and is defense-in-depth.
- **AI URL import: direct fetch → Jina Reader fallback.** Jina is free/no-signup; swap to Firecrawl later if more robustness needed.

### Milestone M2: ACHIEVED
- Generate a recipe from a prompt, import from a URL, modify into a new version, browse/search the library — all working end-to-end against the real API.

### What's next
- Phase 1C: Plan Tab (the signature "AI generates your week" experience, all 6 Figma states).
- Deferred from 1B review: streaming for user-facing generation (wire `generateStream` into the UI — flagged but it's a focused 1C task), `confirm()` → AlertDialog, dedup the two AI dialogs.

## Session 13–14 — 2026-07-06 (resumed after ~5 weeks)

### What happened
- **Session recovery**: located the Session 12 testing session from transcripts; restored full test-loop state (Tests 1–3 passed, drawer fix awaiting retest). Original transcript has since expired — test state now lives in `whats-next.md`.
- **Fixed the localhost login blocker**: Google OAuth appeared broken, but sign-in was actually succeeding. Root cause: the proxy's session check (`endsWith("-auth-token")`) missed **chunked** Supabase cookies (`sb-*-auth-token.0/.1`) that Google OAuth sessions produce, so authenticated users were bounced back to /login forever. Fix: regex matching chunked names (deliberately excluding `-code-verifier`). Also added `http://localhost:3001/**` to Supabase Redirect URLs.
- Griffin briefly landed on the stale Vercel deploy (still pre-1B scaffold) and mistook it for a regression — flagged deploy refresh as a next-session item.
- **Deep security audit** (read-only agent, full app): 1 HIGH, 5 MEDIUM, 6 LOW. Core came back solid (tRPC auth/scoping, prompt-injection hygiene, SSRF guards, secrets, XSS all verified clean).
- **Hardening pass — all findings fixed except deliberate deferrals**:
  - H1: RLS captured into the tracked migration chain (`0002_rls.sql`) + static CI test (`src/server/db/rls.test.ts`) that fails if any table ships without RLS+policy. `is_household_member()` now pins `search_path` (SECURITY DEFINER hijack class). No FORCE: app role has BYPASSRLS, so RLS guards the anon/PostgREST path; app-layer scoping is the primary control (documented in the migration).
  - M1: `(app)` layout now verifies the session per-request via `getClaims()` (the "documented but missing" second leg of the auth model).
  - M2: AI timeouts wired (30s one-shot / 60s streams, fresh AbortSignal per retry attempt).
  - M3: security headers (CSP frame-ancestors 'none', nosniff, referrer-policy, permissions-policy).
  - M4: **daily AI budget** (150 calls/user/day) enforced in Postgres via atomic upsert (`ai_usage_daily` table, migration `0003`) — distributed across serverless instances, wired into `aiProcedure` + the stream route. Per-minute in-memory limiter unchanged.
  - M5: **83 tRPC router tests** added (9 co-located files): auth rejection + household scoping per procedure, budget exhaustion, onboarding race, ILIKE escaping. Full suite now 163 tests.
  - L1: CSRF origin check on `/api/plan/stream`. L2: `shadcn` → devDependencies (hono HIGH advisory out of prod tree). L3: onboarding race closed (unique index on `household_members.user_id` + transaction + loser-recovery). L4: ILIKE wildcard escaping in `recipe.search`. L5: `.env.example` corrected.
  - Deferred deliberately: distributed per-minute limiter (needs Upstash/KV; daily budget already covers cost abuse), full nonce-based CSP, Next bump for postcss advisory, L6 provider-adapters dir (cosmetic).
- Migrations 0002 + 0003 applied to the live Supabase DB and verified.
- Gauntlet green end-to-end: lint, typecheck, 163/163 tests.

### Testing infrastructure note
- Test-mock construction uses `as unknown as` casts in exactly one place per router test file (bridging mock db/supabase into `createCaller`) — a documented exception to the no-cast rule; alternative (hand-written fakes of generated types) is a worse trade.

### Where the test loop stands
See the table in `whats-next.md`. Pickup point: drawer retest (3R), then Tests 4–8.

---

## Session 15 — 2026-07-06

### What happened
Ran the Plan-tab manual test loop from 3R through Test 8. **7 of 8 pass; Test 8 is blocked** on a missing UI flow (see below). Fixed every real interaction bug inline; logged UX/design feedback to the backlog without inline-fixing per the loop protocol.

**Bugs fixed (inline, with the gauntlet green after each):**
- **Card touch target (3R)** — only the text block was tappable; padding + chip row were dead zones (Griffin got ~10s of dead taps). Whole card is now the tap target (`div[role=button]` + Enter/Space handler); chips `stopPropagation` so they keep their own action. `meal-card.tsx`.
- **Enter-to-submit in Talk to the Chef (Test 4)** — plain Enter inserted a newline; now Enter submits, Shift+Enter is the newline. `talk-to-chef-sheet.tsx`.
- **Meal-scoped chat changed the wrong meal (Test 5) — real correctness bug.** The chat scope only drove the sheet headline; the request reached the AI with no anchor, so "swap this" changed an arbitrary day (Griffin reproduced on two meals). Fix: `scopedRequest()` injects the day + dish into the request, matching the convention the card chips already used. Extracted to `plan-helpers.ts` and covered by a new regression test (`plan-helpers.test.ts`, 4 cases). `plan-page-client.tsx`.
- **Drawer width on desktop** — vaul defaults bottom sheets to full-viewport width; on desktop they stretched edge-to-edge while the app is a 430px centered column. Constrained bottom drawers to `max-w-[430px]` centered in the shared `DrawerContent` (bottom-direction only), so all sheets match the frame. `ui/drawer.tsx`.
- **Sheet see-through** — `.glass-sheet` backdrop-blur wasn't compositing over stacked content and the overlay is only `bg-black/10`; bumped sheet background opacity 0.88 → 0.96. `globals.css`.

**Also added:** an X close button (`DrawerClose`) to both sheets — drag-handle/Escape weren't discoverable, especially with a mouse.

**Chips investigation (Test 7):** expanded-sheet action chips read as bare adjectives ("quick", "high-protein"). Traced to stale AI output on the re-dated May plan, NOT the prompt — `chef-system.ts:104` already specifies action phrases ("Make it spicier", "Swap the protein"). Regenerated a fresh plan; chips came back good. Confirmed: no prompt change needed; it was stale data.

### Discovered — logged as backlog blockers
- **No regenerate / "new plan" entry point (V1 BLOCKER).** Once a plan exists, `NoPlanState` never renders again and neither review nor mid-week offers "start a new week." The stream route's `persistPlan` already deletes+replaces the current plan (the one-active-plan data behavior IS implemented), but there's no UI trigger. Breaks the weekly ritual. This is the actual content of Test 8, which can't run until the entry point is built. Deferred to a design+build pass with ux-design-critic.
- **"Something is happening" affordance (macro).** `handleModify` closes the sheet before the mutation resolves, so the in-sheet "Reworking…" text is unreachable, and the success ack is a top-of-page toast the user can't see when scrolled. Net: no reachable pending state for a modify. Needs an in-place, scroll-independent affordance. Design pass.
- **Confirmed-but-entirely-past plan** renders a nonsensical "rest of the week" mid-week view. Likely resolved with the regenerate work.
- **Drawer click-outside-to-close** staged (conflicts with the deliberate `modal={false}` fix; needs careful design).

### Test-data handling
The only plan in the DB was the stale May-30 one (all days ~5 weeks past), which is why confirming it (Test 6) flipped to an all-past mid-week view. Reseeded via date-shift UPDATEs to test 6 (draft, starts today) and 7 (confirmed, 3 past + tonight + 3 upcoming), then deleted it so Griffin could regenerate a fresh plan through the real flow (also re-validated Test 1). Note: unqualified `DELETE FROM meal_plans` was blocked by the auto-mode safety classifier; ID-scoped deletes off auto-mode are the way.

### Dual-review QA pass (end of session)
Committed the work to branch `session-15-plan-fixes`, then ran the dual reviewer.
- **Codex CLI: initially unavailable, then fixed by Griffin.** First attempts rejected every model with "not supported when using Codex with a ChatGPT account" (an account/entitlement issue; re-`codex login` didn't help). Griffin then updated the Codex config out-of-band and it started working. Codex reviewed the full branch diff and **independently confirmed the overlay-button refactor is structurally valid** (button + chips are siblings, not nested; chip clicks don't bubble; gaps fall through) plus tRPC/no-any/300-line constraints. It found 3 actionable items, all fixed in a follow-up commit: (a) the overlay card button had no visible focus ring → added `focus-visible` ring to match the X buttons; (b) disabled chips kept `pointer-events-auto` → added `disabled:pointer-events-none` so taps fall through to open the card (latent footgun, no current caller hits it); (c) `aria-label="Open <title>"` was ambiguous for repeated dishes → now includes the day. Codex also reiterated that `scopedRequest` is a natural-language suffix rather than a structural anchor — already logged as the decision to move to a structured `plan.modify` target if scoping proves unreliable.
- **Internal review (4 parallel finder agents + verify):** found a real regression I introduced plus a reuse miss. Fixed all in a follow-up commit:
  1. **Keyboard a11y bug (regression):** the `div[role=button]` whole-card change nested real chip buttons inside a button role; chips only `stopPropagation` on click, so keyboard Enter on a chip bubbled to the card and opened the sheet (Space double-fired). Refactored to an overlay-button pattern — a real `<button>` fills the card behind pointer-events-none content, chips re-enable pointer events and sit above, so button + chips are siblings (no nested interactives, keyboard unambiguous).
  2. **IME Enter:** added `!e.nativeEvent.isComposing` guard so Enter doesn't submit mid-composition.
  3. **Reuse miss:** `expanded-meal-sheet.tsx` was still building the chip request string inline; migrated to `scopedRequest()` so it's under the regression test.
  4. **X overlaps long titles:** added `pr-12` to both sheet headers.
  - Conventions review: clean. Deferred to the drawer design pass: X `DrawerClose` is duplicated per-sheet (belongs in shared `DrawerContent`) and is first-in-focus-order before the heading.

### Gauntlet
Lint + typecheck clean; 167/167 tests (up from 163). Committed on branch `session-15-plan-fixes` (2 commits; not merged to main, not pushed).

### What's next
- **Build pass (design-led):** regenerate/new-plan entry point + the "AI is working" affordance system + drawer dismissal (X shipped; click-outside pending). Bring in ux-design-critic — these set app-wide patterns.
- Then re-run Test 8 (needs the entry point).
- Vercel deploy refresh (prod still on pre-1B scaffold; needs `OPENAI_API_KEY` + redeploy).
- Triage the rest of the UX backlog into a polish pass.

---

## Session 16 — 2026-07-08

### What happened
The design-led build pass to finish Phase 1C. Brought in the ux-design-critic before building to design two app-wide patterns (regenerate entry point + the "AI is working" affordance), then built all three items from the Session 15 backlog, ran a high-effort dual code review, and fixed everything it surfaced. Gauntlet + production build green; 173/173 tests.

### Built (design-led)
1. **Regenerate / "new plan" entry point (V1 BLOCKER — resolved).** Muted, end-of-list trigger (never the header — fat-finger territory next to Settings): draft → "Not feeling this week? Start over →"; confirmed/mid-week → "Starting fresh? Plan a new week →". It **re-prompts** through the existing `NoPlanState` intent screen (fresh weekly intent is the whole value, not a blind reroll), with a "← Keep current plan" escape. **No confirm dialog** — generate is non-destructive until the stream POST fires (`persistPlan` deletes+replaces only then), so the intent screen IS the airlock; safety is one muted line above the pills when replacing a confirmed plan. New `intentMode` flag in `plan-page-client.tsx`. Unblocks Test 8.
2. **Elapsed-plan state (`week-wrapped-state.tsx`).** When every day is past, replaces the nonsensical "adjust the rest of the week" mid-week view with a chef check-in: "That's a wrap on this week. You cooked N dinners. How'd they land?" → thumbs recap (reused `PastMealRow`, extracted to its own file) → "Plan next week →". Stale-never-confirmed variant reads "This plan's gone stale." Detected via `isPlanElapsed()`.
3. **"AI is working" affordance (the app-wide pattern).** The MealCard is now the canonical "working / just changed" surface (`working`/`justChanged` props): instant tap-depress, then the card dims and its chip row is replaced by a chef-voice line + a shimmer bar (reusing the streaming vocabulary); on success the new content lands with a highlight ring that fades. **The initiating sheet stays OPEN showing pending and closes on SUCCESS, not on tap** — removing the eager close is the core fix for "nothing happens then it silently changes." Scoped modify → the changed card is its own acknowledgment; whole-week modify → a transient bottom ack-pill (`ModifyStatusPills` at the `BottomBar` anchor) carries the chef's sentence and taps to scroll to the change. Backend `plan.modify` now returns `changedDates`; the client swaps optimistically via `setData(data.plan)`. State machine extracted to a `usePlanModify` hook (reusable by future tabs). Reachable error/retry added (modify genuinely fails on AI timeout/rate-limit).
4. **Drawer cleanup.** The duplicated close X moved into shared `DrawerContent` (with focus order fixed — heading before Close); a self-contained click-outside scrim that never touches `document.body` pointer-events (so it can't reintroduce the two-drawer lockup that forced `modal={false}`); removed the now-dead `DrawerOverlay` export.

### Dual code review (high effort) — 4 correctness bugs found + fixed
Two independent reviewers (correctness + cleanup/conventions) over the ~1.2k-line diff.
1. **Stale modify clobbering a regenerated plan (CONFIRMED).** An in-flight modify's `onSuccess` unconditionally `setData`'d — a late response could jam the pre-regenerate plan back over a freshly generated one. Fixed with a monotonic token in `usePlanModify`; `cancelInFlight()` on generate invalidates in-flight results.
2. **Removed days got no highlight/scroll (CONFIRMED, fires on every "clear this day").** The `eating_out` card takes an early return in `MealCard` that lacked `data-meal-date` and the highlight; added both.
3. **Global pending leaked into unrelated sheets (CONFIRMED).** Opening a different sheet mid-modify showed the wrong day's label and got force-closed on resolve. Scoped pending/error/close to the initiating `source` ("inline" | "chat" | "expanded").
4. **Stale ack/error pill over the intent/streaming screen (CONFIRMED).** Gated the pills with `!intentMode && !isStreaming`.
Cleanup: extracted the 4×-duplicated bottom-anchor wrapper into `BottomBar`; removed dead `DrawerOverlay`; confirmed the two-sheet pending/error block is correctly inlined at 2 occurrences.

### Files
New: `week-wrapped-state.tsx`, `past-meal-row.tsx` (extracted), `use-plan-modify.ts`, `bottom-bar.tsx`, `modify-status-pills.tsx`. Changed: `plan-page-client.tsx`, `meal-card.tsx`, `plan-review.tsx`, `plan-midweek.tsx`, `no-plan-state.tsx`, `expanded-meal-sheet.tsx`, `talk-to-chef-sheet.tsx`, `ui/drawer.tsx`, `globals.css` (shimmer + highlight keyframes), `plan-helpers.ts` (`workingLabel`, `isPlanElapsed`), `server/trpc/routers/plan.ts` (`changedDates`). Tests: +6 (modify `changedDates` for changes and removals; `workingLabel`; `isPlanElapsed`).

### Known deviation (flagged, not fixed)
`plan-page-client.tsx` is 330 lines (30 over the 300 rule). Every genuinely cohesive unit was already extracted (hook, BottomBar, status pills, past-meal-row, week-wrapped); the remainder is irreducible controller wiring + a render switch whose extraction would require threading 20+ pass-through props into an artificial child. Judgment call: a clean 330-line controller reads better than a 20-prop presenter. Open for Griffin to overrule.

### NOT verified this session
No browser-automation tool was available in this (non-interactive) session, so the live UI could not be click-driven. Verified: lint, typecheck, 173 tests, production build, dual review. NOT verified by clicking: Test 8 end-to-end, the affordance timing/feel, and especially the **drawer click-outside scrim** (the correctness reviewer traced vaul source and concluded it works and can't re-lock the page, but it wasn't click-tested). See whats-next for the manual script.

### What's next
- Griffin runs the manual script: Test 8 (regenerate) + the affordance on all modify paths + click-outside on both sheets.
- Merge/push `session-15-plan-fixes` (done this session if green) + Vercel deploy refresh (`OPENAI_API_KEY` + redeploy).

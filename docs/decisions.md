# Decisions Log - Meal Management App

All confirmed product and technical decisions. Each entry includes the decision, rationale, and date.

---

## 2026-08-01 (S58) — The §05 ladder governs content; §08 governs controls; rungs are a default, never a lock

**Four calls, all Claude's, all stated rather than assumed and all open to reversal.**

**1. The type ladder does not govern control labels.** §08's own gallery draws buttons at **15 / 14.5 /
13.5px**, and **15px is deliberately not a §05 rung** — the two sections describe different things, and a
button label is not content. So B8b routed **169 content sites** and deliberately left **84**: control
labels, text inputs (16px is the iOS zoom floor, not a design choice), two stepper numerals, `ui/`
primitives (B3's precedent — a primitive changes deliberately, never by sweep), `debug/`, and the tab bar's
10px chrome label. ⚠️ **The cost is visible and stated: controls run at 13 distinct sizes against §08's
three.** That is the same defect one section over. It is filed as the next item rather than folded in,
because sweeping it would restyle every button in the product under a type-scale heading.

**2. A rung sets colour as a DEFAULT, and the call site still wins.** Carried forward from B8a and now
proved structurally rather than by inspection: all ten rungs live in `@layer components`, every colour
utility in `@layer utilities`, so an override wins **by layer rather than by source order**. B8a's
regression is not merely fixed, it is no longer expressible — source position cannot decide it any more.

**3. The chef-voice rung is assigned by who is speaking, never by size.** The only rung in the ladder that
cannot be routed mechanically. Eight non-chef sites sat on its 14.5px measurement and the chef himself was
drawn at three different sizes; `0.9rem` (14.4px) rounds onto it, so five ordinary labels would have been
dropped into gold italic by pure distance. **`type-scale.test.ts` asserts nobody re-litigates it by hand.**

**4. Screen titles: standalone pages take the 32px H1; the tab titles stay at 26.** Login and the no-access
page were on shadcn defaults (30 / 24px) and took the real rung. But **Plan's and Groceries' `<h1>`s are
drawn at 26px** — the Spoken headline — by the designs Griffin ran, and Recipes' was a bare `text-2xl`
scaffold heading above its designed header. All three tab titles now sit at 26 together. ⚠️ **That is a
spec divergence left visible on purpose:** §05 says a screen title is 32px, and three of the app's four
screen titles are not. Routing them to 32 would have been a design change to two surfaces Griffin designed,
made silently inside a mechanical item. **His call, not mine.**

---

## 2026-07-31 (S56) — One control everywhere, mic and all; and B7 covers six sites, not three

**Three calls: two Griffin's, one stated by Claude and open to reversal.**

**1. The mic ships on every freeform control, unwired.** Spec §09's rule is *"never mic-only, never
text-only — both affordances are visible at rest"*, and R1 has no speech-to-text (Griffin, S35). The
recommendation was to render the mic only where a dead one was already ratified (onboarding, seen once per
account) and leave it off Groceries and the chef sheet, which are used weekly — three fewer affordances that
refuse when tapped, two weeks before a cold user runs the app. **Griffin overruled it for literal
conformance**, and the better argument is his: the entire item exists to end *four different answers to one
question*, so a control that behaves differently depending on which screen you are on reproduces the defect
at a smaller scale. **Consistency of the control beats the count of dead affordances.**

*Consequence, so it is not rediscovered:* every §09 surface now carries a mic that answers
*"Voice is coming soon. For now, type it and I'll catch it."* Onboarding says it in the flow's own toast (it
has one, and a graded capture state for it); the others say it inline beneath the field, which is the slot
§09 already draws for the mic's own state. **Wiring STT would close all six at once** — the control is one
component.

**2. B7 covers all six freeform sites, not the three that were filed.** §09 names four controls; the list
was written in S39 and **1E.5 rebuilt Plan afterwards**, so it never counted the Plan intent screen, recipe
modify, or the generate dialog. The three unfiled ones were the same one-line route. The argument for
stopping at three was scope discipline; the argument for six is 1E.7's own — *a half-migrated state is worse
than either end* — and it lands harder here because the biggest omission is the **front door of the
north-star flow**. **Future impact:** the spec's §09 prose still says "four"; treat the code's six as the
count, and re-measure any spec sentence that enumerates the build before scoping from it.

**3. The §09 control's mic and send are 44px, not the 40 the spec draws — Claude's call, stated.** §12 item
05 sets a 44px floor for icon-only controls and calls what it fixes *"a real tap failure, not a style nit"*;
§11 bands icon buttons at 40–46, so 44 is inside the spec's own band; §09's anatomy table says 40. **A floor
beats a drawing.** The container grows 52 → 56 to carry it, and onboarding's shipped field moves with it.
Reversible in one line if Griffin prefers the drawing.

**Also settled, and it is a deferral rather than a fix: BUG-048.** Fixing `SH2`'s blind spot found the
constraint chip's remove `×` at 20×20. It is exempt rather than fixed because the chip is **36px tall** — a
44px target inside it is a chip redesign, which is Griffin's call and not a sweep's. → **B8**. ⚠️ The
exemption is carried by the element (`data-hit-target-exempt="BUG-048"`) and `SH2` **fails if an exempt
control is not undersized**, so closing the bug reds the suite until the attribute is deleted with it — the
same shape as BUG-045's allow-listed line in `palette.test.ts`.

---

## 2026-07-31 (S55) — Recipes' words win, and the caps labels go with the type scale

**Two calls, both Griffin's, both taken as recommended.**

**1. One word per concept, and the shorter pair wins.** The picker said `Everything` / `Cooked before` for
the two sets the Recipes tab already called `All` / `Cooked`, and 1E.5 put the two surfaces adjacent in one
flow. The spec could not settle it: §A governs the **control** (browse is named tiles with counts, never
filter chips) and says nothing about the copy, so this was taste. **Recipes' words win.** The chips are a
width-constrained non-wrapping row where `Everything` + `Favorites` + `Cooked before` risks a wrap at 360px,
and a door labelled `Cooked` with its count beneath loses nothing conversational. Only the copy changes; the
tiles-vs-chips split stands.

⚠️ **`Favorites` in the picker was deliberately not built.** The critic's finding carried a second clause,
and a rename is not a new door — a tile brings its own count, its own suppression behaviour, and a place in
the four-tile budget frame `3e` already spends on the night's constraint. → `idea-backlog.md`, V1.5, with
the argument on both sides preserved.

**2. The caps-label rungs move to B8, with the rest of the type scale.** Filed by the S48 critic as *"three
tracked-out caps labels in one sheet."* Measured: **~46 sites across eight tracking values**, four sizes and
two weights, against a spec that states **exactly two rungs** — Section eyebrow (11px / 600 / 2px, *names a
shelf of content*) and Label (10.5px / 700 / 1.3px, *names a field or a slot inside a card*). It is a
**classification** rather than a find-and-replace, and it is the caps half of the type scale B8 already
owns. Doing it in B6 meant touching 46 type sites and reopening the same files one item later, for two
passes and two visual reviews over one subject.

### The engineering call this produced, stated rather than buried

**The Recipes filter chip came off the primary rung, and the `+` finding is why.** §08 reads *"One filled
cream button per viewport. If two actions both feel primary, one of them is not."* The critic named the `+`
as the loudest object; it did not ask what else on that viewport was wearing the same rung. The **selected
filter chip** was `bg-primary` — a fully filled cream button standing in for a filter state — so softening
only the `+` would have handed the primary rung to a filter. The spec draws a chip as cream-**tinted**
(`on: .14 / .36 / 600 · off: .05 / .12 / 500`), with selection on the action cream and rest on the neutral
cream, *"because filtering is the user's act, not the chef's."* Both are now right.

⚠️ **The rubric already held the rule and the judge did not apply it.** `visual-qa-rubric.md` law 06 has said
*"exactly one filled cream button"* per viewport since S42, and `/visual-qa` cleared this surface at 0
blockers / 0 high in S52, S53 and S54 with two of them on screen. **A rule the gate holds is not the same as
a rule the gate applies** — worth more than the fix itself, because it is the first instance where the
missing check was neither absent nor stale but simply unrun.

---

## 2026-07-31 (S54) — No second Supabase project. The risk was in migrations, not in the test suite.

**Decision (Griffin, S54): NO separate non-prod Supabase project.** Raised S51, carried through S52/S53, and
asked four times in a form that could not be answered — *"accept or set it up now"* never said what was
being accepted. Griffin pushed back on exactly that, and pushing on it showed the framing was wrong.

**What reading the code changed.** The question assumed the suite deletes rows dangerously near real data.
In fact: the dedicated test account already exists (`e2e-harness@example.com` / `E2E Test Kitchen`) — so
Griffin's own proposal, *"just stand up a test account and run the suite against that,"* **is what was
already built**; `wipe()` carries **9 deletes and 9 household-scoped `WHERE` clauses, zero unscoped**, and
never touches users, households or membership; and three guards fire before any write, under BUG-018's
committed project allow-list. **"The suite deletes rows in the project holding your real data" was
technically true and practically misleading.**

⚠️ **A correction the entry owed:** it had implied a second project fixes contention. For the S53 incident
it would not have — that was two suite *runs* colliding, which happens in any single project. A second
project only addresses suite-vs-Griffin contention, and his usage pattern already covers that (heavy suite
work and real use do not overlap), as does the standing one-suite-at-a-time rule.

**Cost that settled it:** FFOS + meal-app are the two free-tier projects; a third means Pro (~$25/mo) or a
second org — real money for protection against a hypothetical future scoping bug four guards already stack
against. **Reopens only on a second machine running the suite (wife's laptop, or CI) → V1.5.**

**The decision this unblocked — migration safety → Workstream D.** Griffin's follow-up (*"isn't this what
staging is for, and what's the right long-term solution?"*) surfaced the actual exposure:
**`drizzle-kit generate` cannot distinguish a rename from a drop-plus-add**, so renaming a column emits
`DROP COLUMN` + `ADD COLUMN` and silently destroys its data, applied straight to the project holding real
data with no automatic backup on Supabase Free. It has never bitten because all 11 migrations are purely
additive — a young schema, not a control. **The agreed answer is a discipline plus one guard, not
infrastructure:** expand/contract as the written default, a `migrations.test.ts` destructive-SQL guard in
this repo's source-scraping idiom, and a `pg_dump` before any acknowledged-destructive migration.
**Explicitly rejected: a staging database** — it only catches what reading the generated SQL already
catches, and gives nothing at the moment it matters, since rehearsing a bad migration and then applying it
to prod loses the data either way.

**Future impact.** V1.5's household sharing is the first genuinely destructive schema change, so the guard
must exist before it. D lands before both validation and V1.5, which is why this did not displace
Workstream B.

---

## 2026-07-31 (S54) — BUG-042 is closed as won't-do; the 44px floor lives on the primitive, not the call sites

**Decision 1 (Griffin, S54).** BUG-042 is **closed as won't-do** and moved to the tracker's Resolved log.
S53 retracted the instruction; S54 closes the row, so the recommendation cannot be re-derived from an open
entry a sixth time. The residual hygiene concern lives entirely in the non-prod Supabase project question
(`open-questions.md`), which is now the only item owed by Griffin on 1F.

**Decision 2 (Claude, S54) — B3's 44px floor is enforced at `ui/button.tsx`, not at each call site.**
The audit found six undersized icon-only controls, but they were not six defects: the shared primitive's
icon variants are **24 / 28 / 32 / 36px**, so *every rung was below the floor* and the next `size="icon"`
anyone wrote would be wrong by default. Fixing six call sites would have left the generator of the defect
in place.

- **Implemented as `min-w-11 min-h-11`, not as a new size.** The declared rung still states the painted
  intent, and since every consumer is `variant="ghost"` — which paints nothing at rest — the floor buys tap
  area and changes nothing on screen. Collapsing the four rungs to one size would have made four names for
  one thing.
- **The trade accepted, stated rather than buried:** two controls that DO paint (the cream send circle in
  the Plan composer and the chef sheet) went **36 → 44px**, a visible change. Justified because spec §11
  bands icon buttons at **40–46px**, so 36 was off-system independently of the hit-target rule — but it is
  a pixel change to a shipped surface and Griffin should meet it knowingly.

**Future impact.** Workstream D's a11y pass **verifies** hit targets rather than auditing them, and B4's
element promotion (9 labels `<p>` → `<h2>`) means D verifies heading structure rather than building it.

**Decision 3 (Griffin, S54) — B4 takes both halves**, the type-level adoption *and* the semantic promotion,
on the argument that the spec names the levels "Group title · **H4**" and "Row title · **H5**", so the
element is half the ask; and that doing it in B means D does not have to redo the same 9 lines.

---

## 2026-07-31 (S53) — BUG-042's toggle is retracted, not deferred: disabling the Supabase Email provider would break the E2E suite

**Decision (Claude, S53, retracting a standing instruction handed to Griffin four sessions running).** Do
**not** disable the Supabase Email provider. The row's premise was false and the action was destructive.

**What the row said:** *"The app has never used the email path, and an auth path nothing uses is surface
area whose safety rests on a dashboard setting nobody re-reads. Griffin's action, not Claude's."*

**What is actually true:** the app has not used it, but the **E2E harness's only sign-in mechanism does**.
`mintSupabaseSession` calls `signInWithPassword` (`tests/e2e/harness/supabase-session.ts:160`, `:174`),
which is the email provider. GoTrue rejects a password grant with `<provider>_provider_disabled` **before it
checks credentials** — so the harness would fail to mint a session and all 123 specs would die at setup.

**Measured, not reasoned.** A password grant against this project's already-disabled **phone** provider
returns `422 phone_provider_disabled`; the same request against the enabled email provider returns
`400 invalid_credentials`. Same code path, symmetric check. That is the proof the email case behaves
identically when off, obtained without flipping a switch that would have broken the suite.

**The evidence was already in the repo and nobody read it.** Line 182 of that same file — the harness's own
cold-start error message — reads *"Check that the Email provider is enabled in Supabase → Authentication →
Providers."* Written by a past session that understood the dependency, never connected to the tracker row.
It was handed back to Griffin unexamined twice in S52 alone.

**Why it is retracted rather than re-scoped.** The hygiene argument was real but small: BUG-042 is measured
**not exploitable** (`mailer_autoconfirm: false`, so a signup claiming an allowlisted address gets no
session until the real inbox owner confirms it). Trading a working test suite for a closed-but-already-safe
auth path is a bad trade. The alternative — re-plumbing the harness off password sign-in — is expensive and
documented as such in `supabase-session.ts`: the admin API is unusable on this project's `sb_publishable_` /
`sb_secret_` keys with ES256 JWTs (`403 bad_jwt: unrecognized JWT kid <nil>`), and public `signUp` rejects
the deliberately-unroutable `@example.com` test address.

**Where it goes instead.** BUG-042 **bundles into the separate non-prod Supabase project decision**
(`open-questions.md`), because that project is precisely what would let prod disable Email while the harness
keeps it on where it lives. Recommendation unchanged: **V1.5**. This collapses two owed items into one.

**Future impact.** If the non-prod project is ever built, disabling Email on prod becomes free and should
ship with it. Until then, **the Email provider staying on is a deliberate, load-bearing state**, and any
future security review that flags it must be pointed at this entry rather than re-filing the same action.

**The generalisable lesson, and it is the fifth shape this phase's lesson has taken.** S50: the tracker was
wrong about what the bug was. S51: right about the bug, wrong about the fix. S52: the bug had already fixed
itself. **S53: the recommendation was not merely wrong, it was destructive — and the thing that disproved it
was a comment sitting in the very file the fix would have broken.** Before executing a parked action, grep
the codebase for what depends on the thing being changed.

---

## 2026-07-31 (S52) — Validate in the shipping configuration: B → C → D → validate, and session replay is part of D

**Decision (Griffin, S52, overruling Claude's proposed reorder).** The 1F workstream order stays
**B → C → D**, with the two validation weeks starting only after all three.

**Claude argued for pulling D's instrumentation forward** and starting the two-week clock ~2 weeks earlier,
on the grounds that calendar time is the uncompressible resource. **Griffin overruled it on two arguments,
both better:**

1. **Validate the artifact you ship.** The PWA is how he actually intends to use the product. Spending the
   two expensive weeks in a browser tab validates a configuration that is not what ships — the result
   either does not transfer or has to be re-run. Starting the clock sooner on the wrong artifact is a bad
   trade, not a cheap one. He also wants the surface finished enough that his feedback during those weeks is
   *about the design* rather than about gaps.
2. **Observability is the debugging substrate, not just the DoD metric.** Claude had scoped D as "the
   instrumentation the time-to-list measurement needs." That was too narrow. Its larger job is that during
   validation Griffin reports a bug and Claude can *see* the error and the path that produced it, instead of
   working from a description. That makes D a precondition for the validation being productive at all — and
   since B → C → D already puts D before validation, Griffin's order already satisfied the concern Claude's
   reorder was chasing.

**Consequence — PostHog session replay is added to Workstream D.** The event taxonomy gives a named
sequence and Sentry gives the stack; neither shows what he tapped. Replay closes exactly the gap he named.

**⚠️ Its masking posture must INVERT the vendor default.** PostHog and every tool in the category default to
masking *input fields*, because in a typical SaaS the sensitive material is what users type. **In this app
it is mostly rendered output** — the chef's memories, the interview's dietary/health answers, household
composition and children's ages, the grocery list. So: mask everything, then explicitly unmask chrome and
structure. A denylist fails open on the screen we would most regret recording. **Same argument that made
BUG-018's guard an allow-list.**

**Future impact.** With two consenting users the privacy risk today is ~zero; the reason to build the
posture now is that the config carries forward, and replay meeting a real user on vendor defaults means the
leak is already live. This is also the first R1 decision that would need real review before a public launch
— it belongs on the same launch-day checklist as BUG-043.

---

## 2026-07-31 (S52) — The two 1F/B5 semantic calls: a merge marker is neutral, a cooked check keeps its hue

**Decision (Griffin, S52 — *"i'm good with your recos"*).** Both of the semantic calls S42 deliberately
refused to sweep are now answered, and they resolve in opposite directions on purpose.

**1. The amber `#FF9F0A` Groceries merge markers → a neutral inset carrying the count as type.** Amber is
the chef (§01), and the spec has no caution hue *because* amber is the chef. A merge is a mechanical fact
about the list — two meals wanted garlic — so amber said the chef was speaking when the chef was not. The
marker turned out to be **two** things: an amber dot beside the item name and the meta line beneath it in
amber. Both are retired; the meta line, which already read `2 dinners`, IS the marker now, styled as the
caught-tray chip's neutral inset. **The honest cost:** amber was the only thing advertising the row as
tappable, and a neutral chip is quieter. What pays for it is that the count says more than the dot did — a
dot said *something happened here*, `2 dinners` names what the chevron is about to show.

**2. The cooked/complete check KEEPS a hue: `--spec-success` `#9CB86F`.** The alternative on the table was
no hue at all. The gold line governs *gold* and says nothing about a success hue; `#9CB86F` is the spec's
own; and a check is the exact thing you scan for on Recipes and Groceries, so going hueless would sink it to
the weight of everything around it.

**Future impact.** `.spec-success-soft` is now the one green in the product, and
`src/components/palette.test.ts` fails the build on any reintroduction of `#30D158` or indigo. The amber
rule is enforced as an **allow-list** with exactly one entry (BUG-045, the quick-add dedupe notice), so a
*new* amber fails while the known survivor is explicitly licensed — and closing BUG-045 turns the test red
until its exception is deleted too.

---

## 2026-07-30 (S51) — Destructive-write guards are allow-lists, never "is this production" tests

**Decision (Claude, against the tracker's own wording, for Griffin to override if he disagrees).**
BUG-018 asked for `assertNotProductionUrl()`. The guard shipped as `assertAllowedProject()` instead.

**Why.** No property of a URL says "production." Any implementation of the named function would have to
enumerate the projects it considers production and pass everything else — so it **fails open on every
project it does not recognise**, which is precisely the case the guard exists for (a `.env.local` pointing
somewhere unexpected). An allow-list fails closed on exactly that case. Same amount of code, opposite
default.

**The allowed ref is committed to the repo, not read from env.** The failure mode BUG-018 describes *is* a
misconfigured `.env.local`; a guard stored in that same file cannot catch it. The ref is not a secret — it
is the host in `NEXT_PUBLIC_SUPABASE_URL`, which ships to every browser that loads the app — and the repo is
private besides.

**Future impact.** Adding a non-prod project is one line in `ALLOWED_PROJECT_REFS`. The generalisation is
worth carrying to FFOS and Leila's Briefing, both of which have harnesses that write to real projects.

---

## 2026-07-30 (S51) — A client-computed value the server persists is a server value that happens to arrive by post

**Decision (Claude, closing BUG-013).** `finishOnboarding` no longer accepts `memory` or `dimension` at
all — the fields are absent from the input schema, so zod strips them and they never reach the process.

**Why not just ignore them.** Ignoring is a rule someone has to keep. Absence is a property of the type.
The original bug was written by someone who believed the synthesis *was* server-side — the comments say so —
so the failure mode is a future reader re-wiring a field that is sitting right there looking authoritative.
Deleting it removes the temptation along with the value.

**The generalisation, which is the part worth carrying:** a recompute is only as trustworthy as the inputs
it recomputes from. Recomputing the memory sentence from `(questionId, values)` while `values` stayed
caller-controlled would have produced a **larger** injection than the one being fixed, because the label
lookup fell back to the raw value. **Every input to a server-side recompute has to be validated against the
server's own domain, or the recompute is just laundering.**

**Future impact.** The same shape exists anywhere the client precomputes a display string the server then
stores. `user.talk` is the deliberate exception — it stores what the user actually said, stamped `explicit`,
which is a different provenance claim.

---

## 2026-07-30 (S50) — A failed generation keeps the week you already had

**Decision (Griffin).** When generation fails and a plan is already on file, the failure is **named in the
action bar's slot and the existing week stays on screen** — not replaced by an error card.

**Why.** You asked for a new week and did not get one. That is a failed action, not a reason to take away
the week you have. The replace-the-screen alternative also has a worse edge: dismissing the error would
drop you onto a plan you never asked to see, with nothing explaining what happened.

**Also settled here:** an automatic retry, **plus** a retry control. Griffin's words: *"we should do a
retry (b). We should not do a partial result, and we should definitely try to retry and give them a retry
button."* Partial results — shipping whatever days generated and letting the person fill the rest — were
explicitly rejected.

**One consequence that shaped the build:** a client-side auto-retry re-POSTs the route, which re-runs
`consumeDailyAiBudget` and bills the daily cap twice per attempt. The retry therefore lives **server-side,
inside the request that already paid**, and only fires before the first token — past that the client holds
half a JSON document a second attempt would corrupt.

**Future impact.** Partial results stay available as a V1.5 option if the two-week validation run shows
generation failing often enough to matter. Nothing in this fix forecloses it.

---

## 2026-07-30 (S50) — The You tab edits the household composition, not a servings count

**Decision (Griffin).** BUG-011's fix is the **real one**: the You tab gets a band editor (adults /
children / babies), the talk op becomes band-aware, and `householdSize` becomes read-only. Griffin's
words: *"I don't see why we wouldn't just make the real fix right now."* He also declined a Claude Design
pass on the new control: *"I don't think we need a design pass for this."*

**Why the cheaper options were declined.** Two were offered. **Absorb-into-adults only** (a bare count
adjusts `composition.adults`) keeps one source of truth with no new UI, but leaves the You tab unable to
say "two adults and two children" at all. **Derive at read time** (compute the size from composition in
`getChefContext`, leave the writers alone) kills the contradictory-prompt symptom in ~5 lines but leaves
the stored column drifting, and `seedChips` already reads `composition.children`.

**Why this was in-scope for a phase that forbids redesign.** `field-edit-sheet` already *was* a stepper
sheet, so going from one stepper to three is an in-pattern change inside an existing surface, not a new
all-states design pass. My initial framing that it broke 1F's scope rule was wrong and was withdrawn.

**The one guess this design makes, stated rather than buried:** a bare head count ("we're 5 now") has no
bands in it, so it **lands on adults** and preserves the bands it was not told about. An unspecified extra
person is an adult, and adults are the only band that always counts toward servings. The You tab is one
tap away for a correction.

**Future impact.** V1.5's family member profiles extend `HouseholdComposition` with a `members` array
additively; the shared `HouseholdComposer` is the control that grows for it, and there is now exactly one
of them rather than two that could disagree.

---

## 2026-07-30 (S49) — No closed beta: two-user validation ships R1

**Decision (Griffin).** `scope-v1.md`'s open release question #1 — parked *for* 1E and carried through
1E's, 1E.7's and 1E.5's closes — is answered at 1F's open: **no closed beta.** Griffin + wife, each
running the full weekly ritual on prod for 2 consecutive real weeks, is the validation bar for R1.

**The decision costs nothing, and that is worth stating because it looked expensive.** The *mechanism*
shipped ahead of the decision in S43a: `SITE_ACCESS_CODE` (hides the app including the login screen,
blocks at the proxy) and `ALLOWED_EMAILS` (decides who may hold an account, blocks at the auth callback
and again in the `(app)` layout) are on `main`, **both default-off when their env var is unset**. So "no
beta" is operationally *leave two env vars alone*, and reversing it later is setting them — an env
change, not a code diff, not a deploy of a diff.

**What it genuinely removes from 1F:** in-app feedback capture, a support path, a bug-report affordance,
an onboarding-for-strangers pass, and multi-user load/abuse/cost-per-user modelling beyond the existing
rate limits. It removes **no** build work on the gate, which was the part that looked like scope.

**What it does not lower.** The DoD still requires *both* people for two consecutive real weeks. Griffin's
wife has been in none of these sessions, which makes her the nearest thing R1 has to a cold user — her
first run is the real test of the interview, and the interview fires exactly once per account.

**Future impact.** A beta is **deferred to V1.5 planning**, not cancelled: household sharing arrives there
and an invite flow has to exist anyway. `ALLOWED_EMAILS` stays in place as the seam. Two open bug rows
attach to the dormant gate — **BUG-042** (GoTrue's email provider is enabled by default, and `ALLOWED_EMAILS`
now makes the `email` claim an authorization boundary; a dashboard toggle, dormant while the gates are
unset) and **BUG-043** (`noindex` + `robots.txt` are build-time and deliberately not env-driven, so going
public is a code change — correct to leave in place through all of R1, graduating to a launch-day item).

---

## 2026-07-30 (S49) — The taste gate closed on three fixes, not on a clean look

**What happened.** S48 executed Griffin's taste pass as a **decision ballot** because he could not see the
captures. S49 then put eyes on the after-captures before merging. Presented with a read of them, Griffin
chose **"fix the three, then merge"** — so 1E.5's human gate closed on three corrections:

1. **The 80vh pane anchored its loudest object in two places ~700px apart** — pinned to the pane bottom
   with a selection, inline under the content on an empty library. The empty-library primary moved into
   the same pinned footer; `L11` **measures** the gap to the pane's bottom edge rather than trusting a
   class, because the fix is a DOM move that passes every text assertion either way.
2. **`I'll write you five dinners`** was hardcoded while the app confirms seven. Now "a week" — the count
   is the request's to make. **BUG-041's class, one size smaller**, and found the same way: by reading
   what the copy promises against what the system guarantees.
3. **The unfittable-reason line broke the app's own separator grammar** (`3 hr — longer than Friday
   allows` beside `Saved in July · 25 min · never cooked`). Now ` · `, which also brings every picker
   screen to ≤1 em dash.

**Why this is recorded as a decision and not a changelog line.** A ballot answered without eyes on the
pixels is a **delegation, not a sign-off**, and closing a phase on one would have made the last human gate
in 1E.5 fictional. Two of the three findings were visible only in a screenshot — which is the whole
argument for keeping a human gate after the machine ones clear. The rule going forward: **when a taste
pass is delegated to a recommendation slate, the visual half still runs as its own pass before merge.**

---

## 2026-07-30 (S48) — BUG-041: the boundary sentence is product copy, not a prompt request

**Decision (Griffin, accepting the recommendation).** Stop asking the model to say *"it's your recipe, so
I won't rewrite it."* The prompt clause is deleted from `buildPicksBlock`; the sentence renders as fixed
product copy on the picked row — *"Your recipe — the chef won't rewrite it."* — in caption colour.

**Rationale.** Two live rounds produced the sentence zero times, the second with both real output fields
named — BUG-033's precedent, third instance: a style clause competing with six operational instructions
loses. The boundary is a fixed product promise, not a creative act, and a promise has to be
deterministic. The sharper argument: the test layer hardcoded the sentence in three places (seed, mock
fixture, E2E assertion), so the suite was proving a guarantee the product did not keep — the exact
fixture-drift `docs/test-plan.md` warns about. Making it product copy makes the fixtures honest as a side
effect. **Not gold and not italic** — the gold line (S42) says gold marks the chef speaking, and this is
the product speaking. That same logic dissolves most of the critic's gold-budget finding on `picked-row`:
the one sentence that had to be singular has left the gold register entirely, and the seven rationales
keep §D's licence. The behavioural half of the rule (do not rewrite/rename/substitute) stays in the
prompt; the model obeys that half.

---

## 2026-07-30 (S48) — The critic's slate: eleven applied, two rejected, four to 1F, and the frame flexed twice

**Decision (Griffin, delegating to the recommendation ballot).** Of the sixteen staged `ux-design-critic`
findings: **applied** — the fixed picker pane, the receipt support line, the opening line counting fits,
un-dim on a selected unfittable row, duplicate/zero-count door suppression, the eyebrow glyph beside
`PICKED` (flush left edge), the opening list capped at 3 + `N more`, the meal sheet's library door refiled
under `ASK ME FOR A CHANGE` (and the day sheet's with it — one shell, one grammar), honest empty-library
door labels (two doors → one), the nested radius stepping one rung (r22 → r18 on sheet contents), and the
empty library's search field removed. **Rejected** — the hierarchy-inversion finding (the critic's
measurement was wrong: the build is 16/13.5px, not 16/22px; the copy trim is the right fix and was
applied instead) and the loudest-object inversion (`Let the chef write it` stays primary: with nothing to
pick, the honest answer is that there is nothing to pick). **To 1F** — the Recipes `+` weight, the
picker/Recipes vocabulary unification, cooked-when evidence inside pushed doors, the caps-label tracking.

**Two deviations from locked frames, ratified.** (1) **The picker sits at ~176px from the top, not §A's
76px** — at 76 the week behind vanishes entirely, and the real defect was the walls moving, not the
number. (2) `3e`'s support line acknowledges an overrun pick (*"Runs long for the night — your call."*)
— undrawn in the frame, required by the un-dim change. Griffin's framing for both: the spec didn't know
everything we'd ever do; flex it when the reason is stated.

---

## 2026-07-30 (S48) — `DEV_TOOLS_EMAILS` set in Vercel Production (with a verification caveat)

> **✅ RESOLVED S50.** Griffin verified test mode is live on prod for his account and asked that it stop
> being raised. The item ran for **nine sessions**, which is the real lesson here: a "one glance next time
> you open prod" check that rides in an owed list is a check nobody does. A `sensitive` env var cannot be
> verified any other way — so when one gates a visible feature again, the verification belongs in a
> behavioral test or a startup assertion, not in a doc asking a human to look.


**Decision.** The eighth-session nag ends: the variable existed but appeared **empty** on every read.
Resolved same-session — it is marked **sensitive** in Vercel, so its value cannot be read back by anyone
(dashboard eye icon or CLI); the empty pulls were masking, not a failed write. Claude set it via CLI,
Griffin re-added his email in the dashboard, and the dashboard save triggered a production redeploy that
applies it. **The only real verification is behavioral**: the test-mode card appearing on the You tab of
prod for Griffin's account. `ALLOWED_EMAILS` is also set and unreadable — **fail-open by design** (empty
= everyone allowed), so prod is not locked; it becomes the invite list when the closed beta starts.

---

## 2026-07-30 (S47) — BUG-034: split the chef's voice into a claim and an argument, with the ceiling in code

**Decision (Griffin).** `chefSummary` becomes the **short claim** — one sentence, enforced in code — and a
new `chefNote` carries the **argument** into the `rationale` prop `chef-header.tsx` already had. New
`chef_note` column, migration `0009`. The two render at 22px cream and 14.5px italic gold, which is what
frame `3i` draws.

**Rationale.** The alternatives on the table were "cap the prompt at one sentence" and "clamp the render
to three lines with the rest on tap". Both treat this as a copy-length problem, and it was not one: the
frame draws two strings, the component has props for both, `week-wrapped-state.tsx` passes both, and
**`plan-review.tsx` passed only one**. An unwired field. Capping the prompt would have left the gold slot
permanently empty on Plan's main screen and lost the chef's range for nothing.

**Two things about the implementation are load-bearing.** (1) **The ceiling is in code, not the prompt** —
BUG-033 established that a style clause loses to the request competing with it, so "one sentence" as an
instruction is a preference and `splitChefVoice` is a fact. (2) **It splits rather than truncates.** An
over-long claim loses nothing: the overflow past the first sentence boundary becomes the argument, which
is the slot it belonged in. Truncating would cut the chef mid-thought to protect a layout, which is the
failure this whole fix exists to avoid.

**Verified live.** Real claims came back at 76–89 characters and the first meal now sits ~210px down a
390×844 screen. **Residual, deliberately not papered over:** the guarantee is one *sentence*, not one
*line*; a single long sentence is still unbounded, and `adversarial` photographs that on purpose.

---

## 2026-07-30 (S47) — Never hand-write a vendor prefix in `globals.css`

**Decision.** The `-webkit-backdrop-filter` declarations come out of `.glass-surface`, `.glass-sheet` and
`.glass-card`, and no hand-written vendor prefix goes back into that file. The build prefixes from
browserslist. Enforced by `src/app/globals.test.ts`.

**Rationale.** Not a style preference — those three classes had **no working blur at all in Chrome or
Android since 1E.7**. lightningcss collapses a hand-written prefix and its standard property onto the
**prefixed** form and drops the standard one; Chrome removed `-webkit-backdrop-filter` years ago. The two
classes that never wrote the prefix by hand (`.spec-chrome`, `.spec-floating`) were correct the whole
time, which is what made the pattern legible once the built CSS was read.

**Future impact.** Anything added to the elevation ladder inherits this. Also a standing lesson for the
QA apparatus: this was invisible to every layer we had — the fill alpha stayed correct, so a blur-less
card reads as deliberate flatness. It took reading the compiled stylesheet, and **BUG-022 had already
misattributed the symptom to the spec's intended `.94` translucency and parked it for 1F on that basis.**
Attributing a symptom to a deliberate design value is how a real defect survives five sessions.

---

## 2026-07-29 (S46) — Who names the night depends on which invocation of the picker you used

**Decision.** `plan.pick` honours a night the person named, and chooses one otherwise. Opened from a meal
(frame `3e`), the recipe lands on that meal's night. Opened from the intent screen (`3b`) or from
`Add to this week` on a recipe (`3l`), the chef picks. The chef rebuilds the rest of the week in every case,
and there is no free-text `date` input — the only way to name a night is to have opened the picker from one.

**Rationale.** §B's "the chef answers with a night and a reason" was implemented unconditionally first,
and that made frame `3e`'s own primary — **"Put it on Thursday"** — a lie: tap Thursday's dinner, get the
recipe somewhere else. The rule and the frame are not actually in conflict; they describe different
invocations. `3b` captions "The chef picks the nights"; `3e` names one, and the person naming it *is* the
act of tapping that meal. Honouring it is not a scheduler creeping in, because there is still no control
anywhere that says "put this on a day of my choosing" — the day comes from where you already were.

**Future impact.** If drag-to-move ever ships (V1.5), it inherits this shape: the day is implied by the
gesture, never entered into a field. And the "constraint, not scheduler" framing survives, which is what
keeps the picker on-thesis.

---

## 2026-07-29 (S46) — A test hook belongs in product code when the alternative is guessing

**Decision.** `GrocerySection` renders `data-dragging` when `@dnd-kit` reports the section lifted, purely
so the E2E suite can wait on it.

**Rationale.** BUG-019 survived three sessions because the drag's real state was unobservable. There is no
`DragOverlay` in this build, so "the drag is live" existed only as an `opacity-40` class — and a
pointer-driven test that cannot see the lift has to *guess* when dnd-kit has measured its droppables,
which is exactly the race that made GR7 flake. Two ways out: assert on the opacity class, which couples the
suite to styling and breaks on the next design pass; or expose the state itself. The second is a smaller
commitment and an honest one — the attribute says what is true, not what it looks like.

**Future impact.** The precedent is narrow on purpose: expose *state* the test needs to synchronise on,
never behaviour that only exists for tests. Drag-to-move (V1.5) will want the same hook on meal rows.

---

## 2026-07-29 (S46) — A fixture that cannot see its input cannot test a guarantee about that input

**Decision.** `buildGenerationFixture()` takes the prompt text and honours a `<picked_recipes>` block.

**Rationale.** §B guarantees picks survive a regenerate. Regenerate deletes the current plan outright, so
the guarantee lives entirely in reading picks off the old week before the delete — and a fixture that
returned the same seven dinners regardless of input would have passed a build where that carry-forward had
been deleted. Nothing on screen would look broken; the person would quietly get a week of the chef's own
dinners. This is the third instance of the same class in three sessions (BUG-030's stale capture spec,
S40's `toContain` prompt test that passed silently), and the rule they share is: **the apparatus has to be
able to fail.** Before trusting a green test, ask what change would turn it red.

---

## 2026-07-29 (S45) — Cost is a forecast, so it only appears where a decision is pending

**Decision.** The week-wrapped screen renders **no cost figure**. The estimate appears on the draft's
consequence line (`Saying yes writes your grocery list · ~$87`) and on the confirmed week's grocery row
(`~$87 estimated`), and nowhere else. W6's "wrapped estimates over the confirmed grocery list" scope line
is retired.

**Rationale (Griffin, taking the recommendation).** The asymmetry is the whole argument. A forecast cannot
be falsified — `~$87` is a claim about a shop you have not done. `$94 spent` is a past-tense claim about
money you already handed over, and it is **the only string in the product a person can check against a
receipt in their pocket.** Get it wrong once and every other number the chef states is worth less. Beyond
accuracy: review *needs* the number because it is an input to a decision; wrapped is a recap, and a cost
figure there invites arithmetic instead of reflection.

**Future impact.** Real prices arrive free with V2 grocery ordering, when the API returns actual line
prices. At that point a *reconciled* figure on wrapped becomes defensible, because it would no longer be
an estimate wearing a past tense. Revisit then, not before.

---

## 2026-07-29 (S45) — Provenance is a column, not a slot type

**Decision.** "The user picked this recipe" is recorded as a nullable `meal_plan_slots.picked_recipe_id`
FK. A picked slot keeps `slotType: "recipe"`. The ledger's `DINNER · PICKED` eyebrow derives from the
column. This **overrides build dependency 3** in `brief.md` and `scope-1E.5.md`, which called for a new
`slotType` enum value.

**Rationale.** Three, in order of weight.

1. **The enum value is actively dangerous.** The cookability predicate
   `slotType === "recipe" || slotType === "leftover"` is duplicated in **eight** places across client and
   server — including `grocery.ts` and `grocery-collect.ts`. Adding a fifth enum value means editing all
   eight, and missing either grocery site means **a meal the person deliberately chose never reaches the
   grocery list**: silent, and the worst possible failure for this feature. A picked slot that stays
   `"recipe"` is already included by all eight.
2. **The column is required regardless.** W9's "picks survive a regenerate by default" has to re-pin
   *which* library recipe, and build dependency 4 has to warm *that* recipe's normalize cache at pick time.
   `recipeId` cannot serve — hydration owns and overwrites it. An enum value carries no identity, so
   choosing it would have meant adding this column in Slice 2 anyway, after paying the eight-call-site tax.
3. **The ledger is satisfied.** "Provenance is `DINNER · PICKED` — type, not chrome" is a statement about
   *rendering*: the eyebrow states it the way it states `DINNER`, rather than wearing a badge or an accent.
   Derived from a column, it renders identically.

**Future impact.** The eight-way duplication of the cookability predicate is now a known latent hazard,
logged rather than fixed — nothing in this build depends on it, and extracting it would be an unrelated
eight-file refactor. **Any future change to `slotType` must extract it first.**

---

## 2026-07-29 (S45) — A rule the model cannot obey belongs in code, not in the prompt

**Decision.** W1's "a method covering four or more meals is absorbed into the week" is enforced by
`src/server/ai/tasks/absorb-method.ts` inside `validatePlan`, not by the chef prompt. The narrower "titles
never open with a cooking method" stays a prompt rule.

**Rationale.** Layer B round 2 asked for *"I want to grill"* **with the absorption rule in the system
prompt** and returned seven of seven "Grilled X" — S40's original finding reproduced verbatim. The model
was not disobeying: the person explicitly asked to grill, and a style clause cannot outrank the request it
competes with. That is the tell that this was never a generation problem. *"Does one word open four or
more titles"* is a string test, and string tests belong in code where they are deterministic and free.

**The design constraint that came with it:** absorption is a **precondition** for dropping. The method is
stripped from the cards only when `chefSummary` already says it, so the information always survives exactly
once rather than being silently deleted.

**Future impact.** A useful split to reuse: prompt rules are for things the model can be *persuaded* of;
code is for things that can be *checked*. Any style rule stated as a count ("at most N", "four or more") is
a candidate for the second category.

---

## 2026-07-28 (S44) — The day sheet and the meal sheet are ONE drawer

**Decision.** `1l`'s day sheet is not a second `<Drawer>` that resembles the meal sheet; both render
inside a single `PlanSheet` whose `target` is either a meal or a day. Opening a meal from inside a day
**replaces** the target rather than stacking a sheet on top of one.

**Rationale.** The ledger says "the same shell, first line and primary swapped", and building it as two
drawers made that phrase decorative. It also reintroduced a known hazard: coexisting vaul drawers are
exactly what produced the `pointer-events: none` lockup that D3 exists to guard, and the two-drawer
version put both sheets on screen for the length of an exit animation (P7 caught it as a strict-mode
violation on `drawer-title`). Collapsing them takes a drawer *out* of the tree rather than adding one.

**Future impact.** Slice 2's picker is a third invocation of the same shell. It should be a third
`target` kind, not a fourth drawer.

## 2026-07-28 (S44) — An out-of-range cost estimate is dropped, never clamped

**Decision.** `validateMeal` accepts a per-slot estimate in `(0, $200]` and returns `null` for anything
else. It does not clamp to the nearest bound.

**Rationale.** Clamping invents a number. The whole guardrail set for W6 exists because this is the one
figure on the surface a user can check against a real receipt, and the design rule already says absence
beats a figure we made up ("a zero is a claim; absence is the truth"). A clamped $200 is a claim too.
The prompt is written to match: *"Return null rather than guessing when you genuinely cannot — a missing
number is fine, a wrong one is not."*

## 2026-07-28 (S44) — The Plan tab's controls are chef requests, not pickers

**Decision.** `Decide now`, `Add days` and `Add a night` each fire a single natural-language
`plan.modify` request. None of them opens a day picker, a stepper, or a form.

**Rationale.** The chef already knows the week; a picker's only contribution would be handing back the
decision the user opened the app to avoid making. It is also the product's own thesis — "the AI generates
the UI; the user is here to react" — applied to the three controls the ledger names. The toast now
narrates the work, so a one-tap ask is legible rather than silent.

## 2026-07-27 (S43) — 1E.5 splits into two slices; library-into-plan enters R1

**Decision.** Phase 1E.5 builds in two slices. **Slice 1** is Plan's own states (ledger §C/§D): the rail,
the chosen-days week, modify/toast/failure, the four time states, generation, the summary meal sheet, and
cost estimation. **Slice 2** is library-into-plan: the picker, the picked meal, and the `Add to this week`
verb.

**Rationale.** Slice 1 depends on nothing in Slice 2 and is shippable alone, so the split buys two
reviewable `/visual-qa` passes instead of one unreviewable diff — the same argument that justified
splitting 1E.7 out of 1F. It also means the signature surface's rebuild can land even if library-into-plan
slips.

**Library-into-plan is formally in R1**, resolving the open question raised S41. Griffin's S41 words —
*"That should be something that we include in R1"* — reaffirmed at S43. It had been designed in full but
never written into a scope doc, and the rule is that nothing gets built that isn't in one. Cheap on the
data spine (`meal_plan_slots.recipeId` already FKs to `recipes`); not free on the edges (Recipes tab,
generation prompt, `slotType`, the confirm path).

**Future impact.** All five of the brief's named build dependencies belong to Slice 2, which is exactly
why Slice 1 stands alone.

## 2026-07-27 (S43) — Spec §12 item 04's floating-primary half pulls forward 1F → 1E.5

**Decision.** The `Add to this week` verb takes the Recipes screen's single floating primary, which
requires deleting the 1D floating search/＋ toolbar and moving search into the header. That is spec §12
item **04**, previously assigned to 1F. It moves into 1E.5. **Squaring the nav's top corners stays in 1F.**

**Rationale.** The verb and the old toolbar want the same pixel. Sequencing them apart would mean building
the Recipes bottom edge twice. Recorded as a change-log line in `scope-v1.md` per the pull-forward rule
rather than allowed to drift.

## 2026-07-27 (S43) — Cost estimation is built, over the recommendation to drop it

**Decision (Griffin).** Scope LLM cost estimation now, rather than removing the design's `~$87` and
`$94 spent` figures.

**Claude's recommendation was to drop them**, on three grounds: we have no cost model, so the only cheap
implementation is an ungrounded LLM guess; a dollar figure is the one number on the screen a user can
audit against a real receipt, which makes being wrong uniquely expensive to trust in everything else the
chef claims; and real per-line prices arrive free with V2 grocery ordering, so building estimation now
means building it twice. `idea-backlog.md` already routed the spend readout to V2.

**Griffin chose to build it.** Implemented with guardrails that make the dishonest rendering
inexpressible: always tilde-prefixed, never cents (rounded rather than truncated — a low guess reads worse
at the till), and null rather than `$0`. The week-wrapped figure estimates over the **confirmed grocery
list** (a real, item-level artifact) rather than the plan, which is the better-grounded of the two inputs.

**Still open:** the word "spent". `~$87` reads as an estimate; `$94 spent` is a past-tense factual claim.
Recommendation is `~$94 est.` — Griffin's call.

## 2026-07-27 (S43) — The meta row has a contract: one cook time, one serving count

**Decision.** Plan's meal-card meta row prints a cook time and a serving count, nothing else. Tags never
enter it. A tag that looks like a duration is **dropped, not deduped**.

**Rationale.** BUG-008 was filed as "prints the cook time twice", but the real defect was that the meta
row had no contract at all — it appended `estTimeMinutes`, then servings, then every tag verbatim. Dropping
rather than deduping is the load-bearing part: a card can state one cook time honestly, and
`estTimeMinutes` is the structured one. Anything else a tag might say becomes a **marker above the title**,
where it can never be mistaken for a second duration.

**Future impact.** Slice 2 gives the meta its one legitimate third part — provenance (`Griffin's pick`).
Frames `3i`/`3j` also draw a leftover source (`Sunday's pork`) in the servings slot; **we deliberately did
not build that**, because no column names a leftover's source and inventing it from rationale prose is
guessing.

<!-- ⑂ S48 merge: the three entries below are from the concurrent main-checkout sessions
     (access gate + Instacart round-trip); their session numbers overlap the worktree's. -->

## 2026-07-30 (S44, second entry) — Ordering goes back to V2. Instacart's door is shut, and Kroger is the only open one in US grocery.

**Supersedes the entry immediately below, which it reversed within the hour.** Both are kept. The
reversal is the useful artefact.

**What happened.** The decision below pulled the Instacart handoff into R1 on the strength of two
claims: the integration is cheap, and a 30-40 day approval clock is worth starting early. Griffin went
to create the account and **could not**. Verified: Instacart's developer application says *"We are
currently not accepting new applications"* and *"There is no waitlist available at this time."* The
self-serve dashboard language I had quoted describes the flow **after** approval. **There is no clock
to start**, so the entire pull-forward argument collapsed.

**Is there another way in? No, and we are not looking for one.** The API key is the only auth and keys
issue on approval. The adjacent surfaces do not substitute: **impact.com affiliate** is open and free
but gives tracked links, not programmatic list creation; **Tastemakers buttons** and **Chicory** parse
recipe markup on *public web pages*, the wrong shape for personalised lists behind auth;
**Northfork/SideChef** are enterprise B2B vendors selling to retailers, a longer path than the
application. Scraping or undocumented endpoints would breach the terms we need to be clean on when
applications reopen and would forfeit the 3% affiliate commission. **The workaround costs more than
the wait.**

**Griffin's call, and the reframe that produced it.** He redirected the question from his own
convenience to market size: *"we shouldn't purely be building this around me. We should be focused on
TAM."* Then: *"let's move it to v2 anyway because it's not a critical need. I'd love to get a polished
version of v1 first."* Correct on both counts, and the TAM research supports the V2 call more strongly
than the availability problem alone does.

**The TAM finding (full tables in `technical-research.md`).** US grocery 2026: Walmart 23.6%, Kroger
~10%, Costco 9.2%, Albertsons 6.4%, Publix 4.1% — top five ≈ 53%. **Exactly one is reachable by API.**
Walmart no longer issues new affiliate API keys; Costco, Albertsons, Publix, Target and Ahold have no
public cart API. **Kroger is not the best open door in US grocery, it is the only one.**

**The structural insight worth carrying past this decision:** *aggregators are the TAM, retailers are
not.* One Instacart integration reaches ~98% of US households across 1,800+ banners and ~100,000
stores. Every retailer-direct integration is a separate build, separate auth, and separate failure
surface for single-digit share. You would have to integrate the entire top five — four of them closed —
to approach what one aggregator gives you. **That asymmetry is exactly why the aggregator door is gated
and the retailer doors are not.** It is the shape of the market, not an obstacle to route around.

**What this settles:**
- **R1 ships no ordering integration.** The 1D clipboard export is the answer. 1F item removed.
- **Instacart stays the target** and moves to a standing watch (no waitlist exists, so it is a manual
  periodic check). Highest-leverage external event for this feature.
- **Kroger is a hedge, not a strategy** — ~10% share, real national footprint (~2,700+ stores, ~35
  states, growing via the **Giant Eagle** acquisition, $1.65B, 2026-07-01). Build only if ordering turns
  urgent before Instacart reopens, and only with its cost stated: per-user OAuth, token refresh, and it
  re-opens the parked account-linking question.
- **Do not integrate retailers one at a time.** The math does not work and four of the top five are
  closed regardless.
- **Testing store:** Griffin shops **Haggen** (Albertsons banner, no API) and has offered to shop
  **QFC** (Kroger banner) instead, aligning his household with the only open API if the hedge is ever
  built.

**Factual correction to a premise raised in discussion:** the Kroger–Albertsons merger was **blocked
and terminated in December 2024**; the Haggen divestiture to C&S died with it, so **Haggen remained
with Albertsons** rather than being pending divestiture. Kroger's actual 2026 move was acquiring Giant
Eagle.

**Process note, and this one is on me twice in one session.** I corrected a four-month-old availability
finding, then acted on the new one **without verifying the signup path was actually open** — I read
post-approval docs as evidence of pre-approval access. The March lesson was "re-verify before it drives
a plan"; the sharper version is **verify the gate you must walk through, not the room behind it.** For
any future third-party dependency: confirm a human can complete signup *today* before it earns a line
in a scope doc.

---

## 2026-07-30 (S44) — Instacart goes first and moves into R1; Kroger is deferred. The March research was wrong.

> **⚠️ SUPERSEDED the same day by the entry above.** Kept deliberately: the reasoning here is sound and
> the conclusion is wrong, because it rested on an availability claim that was never verified at the
> signup gate. Read it as a worked example of that failure mode.

**What changed.** `technical-research.md` had said since 2026-03-28 that Instacart was
partnership-gated ("NOT a public API — requires business development partnership," access reserved
for apps with tens of thousands of MAU) and that **Kroger** should therefore be the first
integration, with Instacart pushed to "V3+, pursue with traction data." **Re-verified 2026-07-30:
that is no longer true, and possibly never was.** Instacart runs a **public Developer Platform**
with a self-serve developer dashboard, published API docs, and an MCP server.

**The decision: Instacart first, in R1. Kroger deferred to V2, conditionally.**

**Why Instacart beats Kroger on the merits, independent of the availability correction:**

| | Instacart shopping-list-page | Kroger Cart API |
|---|---|---|
| Integration shape | One server-side call → a hosted URL | Per-user OAuth + token storage + refresh |
| Account linking | **None.** Auth happens on Instacart's side | Required — re-opens a parked open question |
| Cart state to sync | None | Yes |
| Reach | Retailer network across North America | Two Seattle banners (Fred Meyer, QFC) |

Kroger is the heavier integration for the narrower reach. It also drags in the account-linking
question we parked in April, which is now an argument *against* it rather than a neutral cost.

**Why it moved into R1 rather than staying in V2 — and this is the actual reason, not enthusiasm.**
The integration itself is a **leaf**: it takes the grocery list we already hold, sends names +
quantities, and returns a URL. It touches no schema, no auth, no state, and nothing has to be built
around it. Calling it "foundational" overstates the coupling. What is *not* compressible is the
**30-40 day production-key compliance review**. That is calendar time. Starting the clock during
1E.5 costs approximately nothing and buys the option to ship ordering in R1; not starting it means
ordering cannot ship in R1 no matter how fast we build. **We pulled the paperwork forward, not the
scope.** The product surface is a single 1F checklist item.

**Consequences accepted:**
- **Build it properly once.** The review inspects error handling on every endpoint implemented, so
  a throwaway spike followed by a rebuild would fail review and restart the clock.
- **No merchant targeting, no SKUs.** Instacart does not support directing users to a specific
  merchant, and SKU-based item specification is unsupported. We send ingredient names + quantities,
  which is exactly our list's existing shape. Good fit for us; would be disqualifying for a
  "add this exact SKU to my Safeway cart" product.
- **The fallback is non-negotiable.** If the call fails or the production key is unapproved, the
  Groceries tab degrades to the existing clipboard export with zero loss of function. The manual
  list must always be perfect; integrations are accelerators, not dependencies. Unchanged since March.
- **A second revenue line appears.** Approval carries an impact.com affiliate invitation paying
  commission on attributed orders and new-user signups. This was not in the pricing model and it
  partially decouples revenue from subscription price. Feeds the monetization open question.

**Griffin-owned, blocking:** the developer account, IDP terms acceptance, and the stated use case
are account-holder actions. Claude cannot perform them, and the clock does not start until they
happen.

**Process lesson, logged deliberately:** a four-month-old third-party API-availability finding was
allowed to drive release sequencing without re-verification. **Re-verify external API availability
before it drives a plan, not after.** The superseded March section is preserved in
`technical-research.md` rather than deleted, so the reversal stays legible.

---

## 2026-07-28 (S43) — Closed beta is TWO gates, and both are off when their env var is unset

**Griffin's ask:** the production URL should not be reachable by "just anyone" before launch, and he
should not have to see random people signing up. He added the constraint that matters most here:
*"any changes we need to make when I start sharing this out with people, we should make those changes
at the right time."* That is a reversibility requirement, and it drove the design more than the
security requirement did.

**What was actually exposed (verified, not assumed).** `meal-app-swart.vercel.app` has no Vercel
deployment protection, so the domain answers the whole internet. The *data* was never exposed —
`/you` unauthenticated returns `307 → /login`, and there are four independent layers behind it (proxy
cookie check, the `(app)` layout's server-side `getClaims()`, all 42 tRPC procedures on
`protectedProcedure`, RLS on all 12 tables). The real hole was **open signup**: any Google account
could sign in, get its own household, and spend the OpenAI key at 150 calls/day/user with no global cap.

**Rejected: Vercel Deployment Protection.** It is the obvious answer and it is wrong for this case —
it gates on *Vercel account access*, so every beta tester would need a Vercel account added to the
team. It solves today and breaks the moment Griffin shares the link, which is the phase this whole
change exists to serve.

**The two gates, and why they are separate rather than one control:**

| Gate | Env var | Blocks at | Answers |
|---|---|---|---|
| 1 | `SITE_ACCESS_CODE` | the proxy, before auth | *Can you see that this app exists?* Flat 404 on every path without the cookie, login screen included. Cookie is obtained once via `/invite?code=…` |
| 2 | `ALLOWED_EMAILS` | auth callback, `(app)` layout, tRPC `init.ts`, `/api/plan/stream` | *May you hold an account?* |

**They fail differently, which is the entire reason for two.** Invite links get forwarded and codes
leak, so the code alone must never be enough to create data or spend the AI budget. Conversely an
email list cannot hide the app's existence from a crawler that found it in certificate-transparency
logs, which is what the code is for. One control covering both jobs would do neither well.

**The reversibility rule: unset means off.** Adding a tester is appending to an env var. Going fully
public is deleting two env vars. Neither is a code diff, and local dev plus the E2E harness are
untouched without configuring anything. **The deliberate tradeoff:** a *deleted* env var silently
opens the app rather than bricking it. Fail-closed was considered and rejected — it would lock Griffin
out of production on a typo, which is both likelier and worse than the case it guards. Revisit if
these ever protect something more valuable than a beta.

**The one thing that is NOT env-driven, on purpose:** `noindex` + `robots.txt`. `headers()` is
evaluated at build time while the gates read env at request time, so binding them to the same
variables would let the two silently disagree. It is one line to delete instead, tracked as
**BUG-030** so launch day does not forget it.

**Found during the security review and fixed in the same change:** Gate 2 originally lived only in the
callback and the layout, which left a session *already issued* able to call the API after its owner was
removed from the list — i.e. revocation would not have worked. The check now also sits in
`protectedProcedure`, `authedProcedure` (the one that *creates* the household row), and the
`/api/plan/stream` route, which does not go through tRPC and is the most expensive endpoint in the app.
**Left open as BUG-031:** email is now an authorization boundary, so Supabase's email/password provider
must be confirmed disabled before a second person is invited.

---

## 2026-07-27 (S42) — The gold line: gold marks the chef SPEAKING, not content you read

**Griffin ratified this, and it replaces counting marks with a rule you can apply.** It resolves the
S40 gold-budget question (four onboarding conflicts) and the S41 Plan question (whether Plan's italic
rationale had to shrink to fit §06-C) with one sentence, and it gives the same answer on both surfaces.

**Why a principle beat the budget.** Design Spec v1.0 contradicts itself here rather than the build
violating it: **law 03 explicitly grants the chef's italic rationale accent colour**, while **law 06
caps gold at three marks in the content layer**. A budget count cannot arbitrate that, because the
count says the rationale is over quota and law 03 says it is the one thing gold is *for*. The
speaking/reading distinction dissolves it — the rationale is the chef talking, so it is not competing
for a budget with content.

**The line.** *Gold marks the chef speaking, not content you read.* Cream is still what you press
(§01, unchanged); gold is still the chef (law 02, unchanged). What the line adds is which *half* of
the chef gets it: its voice, not the artifacts of its work.

**Applied — the four S40 conflicts, all four resolved:**

| Conflict | Call | Why |
|---|---|---|
| `SO HERE'S YOUR WEEK` — 3–6 lines of gold body text | → `text.primary` | A list of decisions **about** your week. You read it, and on the deep state there are six of them. Not the chef's italic voice. The arrows dropped to `text.muted` at the same time, for a second reason: they were cream, and cream is what you press — a marker glyph beside a paragraph is not pressable |
| The intro's three explainer rows in gold icon tiles | → bare `text.muted` icons | A decorative container (law 05) carrying gold on a non-chef element (law 02). The reflect screen's own guesses list already did this the spec-correct way, so the flow disagreed with itself about the same object two screens apart |
| The baby-stage chips as gold controls | → cream, matching every other selected chip | A chip you tap is your hand, not the chef's voice. The amber **note** containing them stays gold — `gold.soft` is defined as the chef's speech container, and the note is the chef narrating an assumption it made |
| The caught tray's `Thai` chip as a gold pill | → neutral warm inset | The **tray** stays gold-soft (the chef saying "here's what I caught"); each chip inside it is a value the user supplied |

**What stays gold, by the same rule:** the orb everywhere; the `YOUR CHEF` eyebrow; the reflect hook;
the unsaved note ("One thing: X didn't save. I'll try again…"); **Plan's italic rationale**; and — new
this session — the `.shimmer-bar` and `.animate-highlight-ring`, which went indigo → gold because both
mark the chef *working*. That last one also settles the S41 landed-ring question the same way.

**⚠️ One thing Griffin's phrasing and the build disagree about.** He wrote "orb/byline/hook stay gold."
The orb is gold; the byline (`HERE'S WHAT I'M THINKING`) is currently **cream** and the hook is
**`text.feature`**, not gold. "Stay" reads as *leave alone*, so both were left alone and neither was
escalated — but under this rule both are the chef speaking and would be defensible in gold. Flagged for
his call rather than silently changed, because raising a 25px hook to gold is a visual escalation, not
a mechanical sweep.

**Future impact.** This is now the arbiter for every gold decision in 1E.5's Plan build and 1F's
surface pass. When the two laws disagree again, ask who is talking.

## 2026-07-27 (S42) — "Retire the pre-spec `:root` family" means repoint, not delete

**The 1E.7 checklist said "every surface adopts the `--spec-*` tokens; the pre-spec `:root` family
retires."** Taken literally that is a deletion, which would mean rewriting ~200 class usages across
the app — every `bg-background`, `border-border`, `text-muted-foreground` and every shadcn component
under `ui/` reads those names through Tailwind's `@theme inline` block. Instead each pre-spec token
became an **alias onto the spec token that plays its role**.

**This satisfies the actual goal.** The point was never the variable names; it was that there must not
be two palettes to accidentally mix inside one surface (the failure mode globals.css warned about after
pass 1). After the repoint there is one palette, reachable under two sets of names, and no independent
colour value survives outside the `--spec-*` block.

**The one alias with a large visual consequence, called out rather than buried:** `--primary` went
**`#3A86FF` → `var(--spec-action)` (cream)**. Indigo is not a colour in this system — §01 admits cream
(what you press) and gold (the chef), and no third accent. Every `bg-primary` in the app is a button,
so the alias is the whole of the fix, but it repaints every primary button in the product.

**Two derived tokens were added rather than invented:** `--spec-raise-1` / `--spec-raise-2`, each the
composite of an elevation utility over the floor, for the handful of shadcn slots used as *solid* fills
behind other blurred surfaces. Deriving them from the ladder is what keeps a solid card and a
`.spec-glass` card reading as one material instead of two.

**Future impact.** 1F's item 03/04/05/07 pass and 1E.5's Plan build both write against `--spec-*`
directly. The bridge exists for `ui/` primitives and inherited class names, not as a place to add new
colour.

## 2026-07-27 (S41) — Phase 1E.5: Direction C, and the Plan decisions ledger

**Context.** Two Claude Design waves ran for Plan: `Plan Directions.dc.html` (A/B/C — the structural
choice) and `Plan Horizon.dc.html` (the past-R1 build of C). Snapshots live at
`docs/design/surfaces/plan/imported-wave1.dc.html` and `imported-wave15-horizon.TRUNCATED.dc.html` (the
second is cut at 256 KiB — the `DesignSync.get_file` cap — mid-frame inside `2b`). A consolidation pass
into a single "Plan · Final Direction" sheet is in flight; this entry records what is settled so far.

**The structural decision — Direction C, and a day is a group.** A/B posed one question: is Plan a
document you read or a board you arrange? B's dated rail won the structure, A won the voice (the
feature-size summary, the tonight briefing, the clarification screen whole). The argument that decided it:
**voice is portable, structure is not** — B's rail can host A's type, but A's card list cannot grow a dated
spine, leftover dependencies and drag without becoming B. The scaling move is that **a day stops being a
card and becomes a container**: one glass group per day, one inset row per meal, with dinner carrying the
title, meta and rationale while lunch and breakfast are single lines. Fifteen meals therefore still produce
five rationales, not fifteen — the density fear the pass started with dissolves under its own model.

**Decisions carried into the build spec:**
1. **Intent entry is the quiet door** (`1b`) — a single row at the foot of the ask, "Cook something I've
   saved / I'll build the week around it". The proactive-offer version (`1a`) and the chip-shelf version
   (`1c`) are retired *as intent-screen options*; their content moves into the picker. Rationale: `1a` only
   fires when the library has stale candidates, so the door must exist underneath it regardless.
2. **The picker becomes the exploration surface**, not a dropdown — it is the only ingress into the library
   from Plan, so the staleness read ("you saved these and never cooked them") lives in it as content rather
   than as a sort order, alongside browse affordances and an empty state.
3. **The meal sheet is a row shell** (`5-iii`) with the rationale at feature size on top so it opens in the
   chef's voice, and free-text as **one expanding row**, not a permanent field. `5-ii` (steppers + an
   ingredient table) is rejected outright: it puts ingredient data in Plan, which is the exact thing the
   sheet-as-summary decision exists to prevent. The deciding property is extensibility — new capability
   equals new row, and it is the only model that also works as a **day sheet**.
4. **Tapping a day opens a day sheet sharing the meal sheet's shell** (`1l` over `1m`) — rows, one per meal,
   plus day-level actions. Expand-in-place was drawn and loses on scroll behaviour and on having nowhere to
   put day-level actions.
5. **No food photography; reserve the geometry.** There is no image source — `recipes.imageUrl` exists as a
   column and is written and read by nothing, and Plan's meals are all AI-generated, so the URL-import path
   would not populate it either. Cards reserve a thumbnail's space so one could slot in without a redraw.
6. **The gold budget: gold is the chef speaking, not content you read.** Design Spec §06-C says a chef
   header spends all three content-layer gold marks so "nothing below may add a fourth", while **law 03
   explicitly grants the chef's italic rationale colour** — the two rules were never reconciled, and Plan is
   the only surface carrying both a chef header and a repeated rationale, which is why it surfaced here.
   Griffin's call: **do not shrink Plan to fit; keep the italic rationale gold.** The resolving line is that
   gold marks the chef *speaking* — so it does not extend to content the user reads, which also answers the
   S40 reflect-screen question (`SO HERE'S YOUR WEEK` is a list of decisions, not the chef's italic voice,
   so it does not qualify). Recorded rather than amending the spec.
7. **Provenance is `DINNER · PICKED`, never a possessive.** "YOURS" is unambiguous only while R1 is solo and
   breaks the moment V1.5 puts two people in a household. The meta line carries who once households exist.
   Mechanism: eyebrow + meta, **no badge, no accent, no second card design** — a pinned meal is the same
   card, and the real tell is the rationale (a chef-invented meal argues for the dish; a pinned meal argues
   for the placement).
8. **No inventory mode.** The design proposed that at five or more pinned recipes out of seven the week
   drops its summary and presents as a list. Cut: the premise ("the chef has nothing left to arrange") is
   false — at six of seven the chef still picks nights, shops, and spends leftovers. One presentation that
   degrades, with the summary shifting from claiming the dishes to claiming the arrangement.
9. **The action bar transforms into the toast** rather than two objects swapping through the slot. Griffin's
   priority was that a change must be *visible* even if the user isn't looking at the row that changed; both
   candidate treatments satisfy that identically, so the tiebreaker was that a persistent toast **above** the
   bar reopens the two-floating-objects violation §07 Fix 2 forbids and state 2b just corrected.
10. **The meal row is the unit of change feedback**, never the day container — the ring lands on the row's
    own 14px radius inside the day's 18px, the acknowledgment **is the rewritten rationale in place** (the
    only ack that survives being scrolled past), and **rows never reflow while the chef is thinking**. The
    single exception is an error, which must persist until dealt with and therefore grows the row.
11. **A container is only drawn when it has something in it.** Absence is provisional type on the rail — a
    56px row with a date, one muted phrase and one control — never an empty glass box and never a dashed
    rectangle. One rule fixes the empty day, the out-night and the unplanned day.
12. **Streaming reuses the provisional-row vocabulary.** A slot not yet written and a slot being written are
    the same object at different times, so a generating week is the full rail arriving instantly with every
    slot present and provisional, resolving in place, with "14 of 15 written" as the progress readout.
13. **The grill wall is fixed in generation and at the week level, not in the eyebrow.** Titles never open
    with a cooking verb (enforced in generation so "Grilled Cheese" keeps its name), and when one method
    covers four or more meals the chef states it once at feature size and the word is banned below. The
    eyebrow fix was drawn and **rejected** because it collides with the provenance marker —
    `DINNER · YOURS · GRILLED` is not a shippable line.

**Also settled, carried from the pass's own ledger:** the header orb (34px with presence dot and byline,
never a hero orb on Plan) · confirm is scroll-conditional, never a persistent CTA bar · the reasoning gets a
door ("Why this week?"), the quietest control on the screen · the meta row is one cook time and one serving
count with markers above the title (**answers BUG-008**) · the sheet is a summary with ingredients and steps
staying in Recipes (**answers BUG-006**) · a titleless slot is provisional, not loading (**answers
BUG-009**) · out-nights are first-class card states.

**Future impact.**
- **1E.5's build touches Recipes, not only Plan** — the pinning verb takes the Recipes screen's single
  floating primary, which retires the 1D floating search/＋ toolbar per spec §07 Fix 2.
- **Library-into-plan is a scope addition to R1 that Griffin has not formally ratified.** It is designed in
  full and logged in `idea-backlog.md` with its two build consequences (`slotType` has no "user chose this"
  value; a library recipe without a `normalized_ingredients` cache hits the normalize path at confirm).
- **Two capabilities were drawn and deliberately cut** so they cannot reach the build by accident: a
  held-recipe queue with a reminder, and the chef deferring a decision to resolve later. Both are logged as
  V1.5.
- **The design horizon for this pass is past R1 by instruction** (Griffin, S41) — controls with no backend
  are drawn anyway and cut at R1 scoping. The `Dinner / Lunch / Breakfast` scope control is the live example:
  it reverses the S36 call to omit dead toggles from the onboarding hand-off, and that reversal is
  deliberate, because S36 was a *build* decision and this is a design artifact.

---

## 2026-07-27 (S40) — 1E.5's DESIGN pass runs in parallel with 1E.7; only the BUILD is ordered

**Decision.** The "1E.7 before 1E.5" rule constrains the **build**, not the design. Griffin's Claude Design
pass for Plan may run concurrently with 1E.7's mechanical code sweep — different artifacts, zero file
conflict. **1E.5's build still lands after 1E.7 ships.**

**Rationale.** The original ordering argument (scope-v1, S39) was precise: *"1E.5 rebuilds Plan from scratch,
so applying the mechanical sweep first is the difference between building the signature surface once and
building it twice."* That is a statement about writing components, and the design pass writes none. The
design pass is also the long-pole item — it needs Griffin's iteration time, not Claude's — so serialising it
behind a mechanical sweep costs a session for nothing.

**The blocking prerequisite, found when reconciling the two threads.** `docs/design/PROJECT-CONTEXT.md` — the
file Claude Design reads **first** for the entire app project via the GitHub connector — **was never updated
when Design Spec v1.0 landed in S39.** It still pinned `#0E0E10` bg, the retired `#3A86FF` indigo accent, and
`rgba(255,255,255,.08)` borders (the exact cool white law 04 forbids), and named the superseded
`Guidelines.md` as "the full written system". `surfaces/plan/brief.md` (written S38) compounded it, instructing
the pass to use "current tokens" and calling the palette "provisional, locked in 1F" — which S39 made false.
**Any Plan design generated before 2026-07-27 is in the retired palette and should be regenerated.** Both
files were rewritten to point at the spec, and the brief now states plainly that Plan's own shipped screens
are the "before" and must not be sampled from.

**Future impact.** S39 landed the spec into `globals.css` and migrated onboarding but never updated the
design tool's source of truth, so **code and design silently diverged for a session.** Any future change to
the design system must update `PROJECT-CONTEXT.md` in the same commit — it is not documentation, it is the
input the design tool actually reads. Worth a line in the design workflow doc.

**Also:** the gold-budget open question is now an **input** to an in-flight design pass rather than a
post-hoc call. Plan carries a per-card chef rationale ×7, the same shape as the reflect screen's gold block,
so whatever Griffin decides for reflect must hold for Plan or the two surfaces disagree permanently.

## 2026-07-26 (S40) — A plan rationale may only describe what THIS plan buys

**Decision.** The chef's per-meal rationale is constrained on three axes, in `PLAN_OUTPUT_RULES`:
it may only claim reuse of **fresh perishables that actually spoil** (never pantry staples like oil,
vinegar, spices, rice or pasta); it must name the other meal by its **weekday name**, never by a day
number or offset; and it may describe **only what this plan buys**, never what the person already owns —
no "from last shopping trip", no "already in your fridge" — unless their own request said so. A planned
leftover must additionally be plausible from the dish it comes from.

**Rationale.** All three are real Layer-B findings from the first live run after the S39 reuse rule
shipped. The rule itself works — six real weeks, every one reusing a perishable, none losing variety — but
giving the model a reason to cross-reference days made it reach for things it must not say. "Reusing olive
oil **from day 0**" printed our internal `dayOffset` vocabulary onto a card the user reads every week.
"Use spinach fresh **from last shopping trip**" invented history for a user who had never shopped — and
**there is no pantry model at all**; pantry is explicitly V1.5, so the chef cannot know this and must not
imply it. The third is softer but corrosive: nobody needs help finishing a bottle of oil, so claiming to
reuse one makes the whole rationale read as filler and devalues the times it's real.

**Future impact.** This is the same principle that cut `ALREADY CIRCLING` in S39 — **the chef never makes a
promise the system cannot keep.** When pantry lands in V1.5, the "never what they already own" clause is
the one to revisit, and it should be relaxed only as far as the pantry data actually reaches.

**Also decided:** a system prompt guarded only by `toContain` assertions is not guarded. The S40 edit passed
the existing suite silently; three assertions were added for the new clauses. Prefer inline snapshots on
prompt builders going forward (the engineering rule already says so — the plan prompt had drifted from it).

## 2026-07-26 (S40) — Spec-vs-locked-design conflicts are Griffin's call, not a gate finding

**Decision.** When `/visual-qa` finds that the build violates Design Spec v1.0 but is **faithful to a Claude
Design pass Griffin ran and ratified**, the finding is raised and logged — not fixed, and not counted
against the 0-blockers/0-high gate. Genuine defects (things that are wrong against *any* reading) are still
fixed in the loop.

**Rationale.** The spec says it wins where an earlier screen disagrees, but the reflect design was authored
in the *same session* as the spec, so "earlier" decides nothing. Silently repainting the payoff screen of an
interview Griffin had just locked would be Claude overruling a design call on a technicality. The rubric
already says a real product/taste question does not get forced green; this extends it to design-authority
conflicts. Four such findings were raised in S40 (open-questions.md) — the largest being the reflect week
list's gold body text against laws 03 and 06.

**Future impact.** **Resolve these before 1E.7 starts**, because 1E.7 sweeps the palette across five
surfaces using onboarding as the worked example — whatever gold rule holds there gets copied everywhere.

## 2026-07-26 (S39) — Design Specification v1.0 adopted, migration split into three passes

**Decision.** Griffin's design system (Claude Design, "Gold voice, cream hand", theme 11i) is canonical:
where an earlier screen disagrees with it, it wins. Its §12 migration table is applied in **three passes**
rather than all at once or all in 1F:
1. **S39** — the onboarding flow (done).
2. **New phase 1E.7** — the mechanical app-wide items (warm alphas, wash recipes, radius scale), **before 1E.5**.
3. **1F** — the surface-specific items plus type scale, motion, and component consolidation.

**Why the ordering.** 1E.5 rebuilds Plan from scratch in Claude Design → code. Applying the mechanical sweep
first is the difference between building the signature surface once and building it twice. Onboarding went
first because Griffin runs the interview for real next and should run the design he just locked.

**Accepted cost.** Onboarding looks different from the rest of the app until 1E.7 lands.

**Future impact.** The 1E.5 Plan brief must be written against the spec, not against the pre-spec palette.
`--spec-*` tokens + the elevation utilities in globals.css are the migration surface; the pre-spec `:root`
family retires at the end of 1E.7. The spec's §09 "one way to talk to the chef" means the four freeform-input
controls (onboarding done, You / Groceries / chef sheet remaining) consolidate into one.

## 2026-07-26 (S39) — `skill` and `effort` are different questions; cost lives inside `goal`

**Decision.** The deep round asks about cooking **skill** (what techniques are on the table) AND **effort**
(how much you feel like doing tonight), which are distinct from each other and from the core weeknight-time
ceiling. Claude proposed merging effort into skill; **Griffin overruled it** — an advanced cook can still be
exhausted on a Tuesday, and a 30-minute meal can be one pan or thirty minutes of knife work. Effort is instead
**suppressed when the weeknight ceiling is ≤30 minutes**, where the ceiling has already answered it.

**Cost sensitivity is not its own question.** It lives as one option among several in `goal` ("Anything you're
working toward?"), which already carried "Keep costs down" but ranked too low to be asked. Asking "are you
doing this to save money" singles a person out; "what are you working toward" gets the same signal from
someone who would never answer the first version honestly.

**Ingredient reuse is a planner default, not a preference.** Nobody wants a wasted carton, and it shortens the
grocery list, so it is a rule in `chef-system.ts` rather than something a user has to opt into.

**Future impact.** The bank now holds more good questions than one interview should ask (8 questions, a
5-question round). That is what the planner is for, but it means adding a question displaces one rather than
lengthening the interview — re-run the eval and read the persona table before assuming otherwise.

## 2026-07-26 (S39) — Griffin has to be able to test it (standing requirement)

**Decision.** Every feature plan answers: how does Griffin get into the state, how does he get back out of it,
and how does he report on it. Test-mode controls are **server-gated by an email allowlist**
(`DEV_TOOLS_EMAILS`), never a `NODE_ENV` check — the phone he tests on runs production. Recorded in
engineering-principles.md.

**Why.** A product this personal is validated by living in it, and friction in that loop shows up as less
feedback rather than as a complaint about the friction. The 1E interview is the worked example: it fires
exactly once per account, so without a reset the only way to re-test it was a new account.

**Future impact.** The full version (capture, dictate, auto-attached state + event metadata, LLM-cleaned into
a ticket) is scoped to 1F alongside PostHog and is a candidate Linear graduation trigger.

## 2026-07-26 (S39) — No closed beta; no household sharing in R1

**Decision.** R1 validation stays Griffin + wife. **No closed beta** (resolves the scope-v1 open question that
was parked for 1E). His wife tests on his phone rather than pulling household sharing forward — sharing stays
V1.5 in full.

**Why.** Nothing in R1 is gated on a beta, and a beta is a distribution decision rather than a product one.
Griffin's read: V1.5 will land before this goes out more broadly, which is why it was called V1.5.

**Open, and now logged:** how often two adults in a household actually eat the same dinner. It decides whether
V1.5 sharing is a coordination feature or a per-member planning feature — a much bigger build. Our research
doesn't answer it.

## 2026-07-24 (S36) — Household composition: band counts, and a baby's STAGE drives servings

**Decision.** `user_preferences.householdComposition` stores three band **counts** plus one stage:
`{adults, children, babies, babyStage}`. `householdSize` stays as the derived total every existing
consumer already reads, computed server-side (composition wins when both are sent).

**Why counts, not per-member ages.** The brief's schema note said `children[ageYears]`, but the
**locked design (1D) captures three stepper counts with no age-entry UI**. Storing arrays the UI can
never populate means fabricating or null-filling data. V1.5 (Family Member Profiles) extends the same
JSONB with an optional `members` array — additive, no breaking migration. Griffin ratified.

**Why a baby stage.** Asked whether babies count toward servings, Griffin declined the binary: it
depends on the baby's age, since past ~6 months they increasingly eat part of the adult meal. He's
right, and "under 2" is too coarse to act on. So a **conditional follow-up** (Under 6 months / 6-12 /
12-24) appears only when `babies > 0`, and the rule follows the stage:
- **under 6m** → 0 servings, chef told to plan the adult meals normally (milk only).
- **6-12m** → 0 servings, but the chef is told to note a soft, unsalted, hazard-free portion from the
  same dish.
- **12-24m** → counts toward `householdSize` (they eat the family meal at a smaller portion).

Griffin's own household (2 adults + baby) derives to 2 — matching the previous default, no regression.
**This follow-up is an addition to the locked design** and is flagged for his taste pass.

**Related scope call.** R1 plans **ONE meal per slot** and tells the chef how to adapt a portion for
the little ones. Separate kid meals would mean multiple recipes per slot — a schema change, deferred to
V1.5 (logged in idea-backlog).

**Onboarding-complete flag** lives on `users.onboardingCompletedAt` (not `user_preferences`, whose row
is written lazily and may not exist pre-interview). It's read through the `ensureOnboarded` call
`OnboardGuard` already makes, so the first-run gate costs no extra round-trip. **Both complete AND skip
stamp it.** No backfill for existing users — Griffin: "the accounts mean nothing right now."

## 2026-07-24 (S36) — The deep-round planner is deterministic, not a model call

**Decision.** The adaptive deep round picks its next question with a pure scored bank
(`value × novelty × fatigue^asked`) and stops on four tunable knobs: a hard cap, a minimum value, a
fatigue decay, and a consecutive-low-signal cutoff. No AI call between screens.

**Why.** Onboarding is the most latency-sensitive moment in the product. A model call between every
question would buy question-ordering at the cost of seconds of dead air on a first run, plus cost and a
failure mode at the worst possible time. Deterministic is instant, free, exactly reproducible — and
that reproducibility is what makes the policy **tunable against an eval** rather than a vibe.

**It earned this immediately.** `scripts/1e-onboarding-planner-eval.ts` runs six personas; on the first
run it caught that a vegan got a *shallower* interview (3 questions) than an omnivore (4), purely
because the suppressed protein question left the threshold sitting on a cluster of tail values.
Retuned `minValue` 0.42 → 0.38; now 6/6 pass and every engaged persona gets 4.

**Reversible.** An AI planner can replace `pickNext()` behind the same interface without touching the
flow.


**Onboarding interview (#4) — design LOCKED to direction 1D "Talk it through"** (2026-07-24, Session 35)
- **One interaction model, not two.** Every question screen: tappable answers on top (primary), a bottom "or just tell me" field, and a "what I caught" tray that surfaces only what free-text adds beyond the pills. Satisfies both hard rules at once — AI-proposes/user-reacts (the pills) and not-chat-first (the field is a per-question escape, no thread). Resolves the "voice vs tap = two apps" tension that killed the earlier top-of-screen mode toggle.
- **Mic-as-text for R1.** The bottom field is a TEXT input routed through the existing `user.talk` capture path; the mic icon stays for the feel but fires a "voice coming soon" toast. Real dictation/STT deferred (out of R1 — see open-questions "Dictation implementation approach"). Rationale: the tap+type path is fully functional with zero speech infra, so voice can't block the 1E close; dictation is an uncosted principle (unit-economics tie-in).
- **Weeknight cook-time is a core question, not optional.** A first plan full of 90-min recipes for a 30-min cook is a bad first impression — too load-bearing to defer. Core = 4 (household · diet · allergies · weeknight time), then an adaptive opt-in deep round.
- **Deep round is adaptive with a tunable stopping policy** (a build task w/ eval): probe as far as the user will go, but a "learned enough" threshold + hard cap so it never exhausts them. Value-progress framing ("the more you tell me, the better your plans get") + an always-present one-tap "I'm good for now."
- **Household captured as composition + ages, not a count** — 9-mo vs 3-yr vs 16 are different prep/texture/portion profiles the chef must cook for. Schema shape is a build dependency (`/architect` pass; R1 recommendation = a flexible composition field, keep `householdSize` derived, defer full per-member *preference* profiles + conflict navigation to V1.5 Family Member Profiles). See open-questions.
- **Hand-off = the pre-seeded Plan intent modal** (door #3 of the three Plan front doors), not a bespoke onboarding screen — one architecture.
- **Palette (amber+blue) stays provisional — a 1F decision**, explored in parallel now (open-questions) so 1E.5 stays compatible; the #4 build keeps current tokens.
- Direction history: 1A (one-per-screen structured), 1B (stacked chat foil — rejected, drifts to a chat log), 1C (ambient orb — "felt like a tech app"), **1D** (the merge: 1C's aliveness + chef warmth via an ember presence + 1A's clarity). Build spec: `design/surfaces/onboarding/brief.md`.

**Ticketing / Linear adoption — deferred; trigger = in-app feedback capture generating real tickets** (2026-07-24, Session 35)
- **Not adopting Linear (or any external tracker) yet.** The `docs/` system — `idea-backlog.md` (features), `open-questions.md` (decisions), `bug-tracker.md` (defects), `decisions.md` — is working and, critically, **Claude-legible**: Claude triages, cross-links, and closes items across these files every session. For a solo team that's most of what a tracker buys, without the overhead.
- **The trigger to adopt Linear is a concrete event, not a feeling:** when the **in-app bug/feedback capture** (idea-backlog, S35) ships and a small beta starts generating **tickets from outside Griffin's own head.** That volume + the "an agent picks it up and fixes it" loop Griffin wants both need a real queue with an API — which is what Linear is for. Sequencing: **build the capture feature → that IS the Linear trigger.**
- Until then, adding Linear is overhead without payoff. The Linear MCP connector is available but needs auth when we get there (a two-minute setup, not now). Revisit at the post-MVP beta gate. Two-way door.

**Platform: R1 ships as an installable PWA (folded into 1F); native mobile held** (2026-07-24, platform-strategy discussion)
- **Ship R1 as an installable PWA — folded into Phase 1F alongside the design-system pass.** Manifest + service worker + offline shell + home-screen icon set + install prompt, so the app lives on Griffin's + his wife's home screens and launches full-screen (no browser chrome) for the 2-week validation. ~1 slice of work; pairs naturally with the 1F visual refresh (beauty is a design problem, not a platform one).
- **Native iOS/Android stays HELD.** The current app is already a phone-form-factor web app (430px shell, bottom tabs, `@dnd-kit` touch-first gestures, glass) — the "web mobile mock" already exists. Native is a **full UI rewrite, not incremental work**: the API-first architecture means the backend (tRPC, AI service, Drizzle/RLS, all grocery/plan business logic) ports for free, but every screen is rebuilt in RN primitives — Tailwind, shadcn, `vaul`, `@dnd-kit`, CSS glass don't port. It's a second front-end.
- **Rationale for the sequencing:** the core bet ("AI generates the UI") is still unvalidated — R1's DoD (Griffin + wife run the full weekly ritual for 2 consecutive real weeks) isn't met. You don't commit an unproven, still-changing interaction to the most expensive-to-iterate medium. Web iterates ~5–10× faster (hot reload, instant deploy, no app-store review); a native build now = rebuilding a moving target. Nail the interaction in web/PWA first, then the native port is a translation, not a discovery exercise.
- **When to revisit native (the trigger, not "native looks prettier"):** a real capability the web/PWA can't meet — reliable push (V1.5 expiration alerts), camera/share-extension for photo+social recipe import (V2), widgets/offline — OR a validated interaction + a demonstrated web fidelity ceiling users hit — OR App Store distribution/GTM. Master plan parks native at V4; the most likely puller-forward is **iOS PWA push reliability** (works on 16.4+ but historically finicky) — if push becomes core in V1.5, that could argue a Capacitor wrapper or native earlier than V4. Two-way door until then.

**Phase 1E build — You audit surface + AI capture** (2026-07-22, Session 33)
- **Built the full AI capture (`user.talk`) this session — Griffin's call (Option B).** The design's hero is
  free-text "Talk to the chef," which is a net-new AI NL→ops task not among the five listed build features (#1/2/3/5/6)
  and overlapping the deferred #4. Presented the fork; Griffin chose to build it now rather than defer it with #4.
  Rationale for building it right: it's the design's centerpiece + the OQ#2 "AI-first capture" thesis made real. It
  was gated on a **real-model safety eval** (allergies must never drop/mis-file) before being trusted — passed 9/9.
- **Allergy weighting is a `(allergy)` string marker, not a schema change.** A restriction stores as
  `"gluten (allergy)"`; the You-tab safety card parses the suffix for the sub-label + red weighting, and `user.talk`
  writes it when `isAllergy`. Kept out of the chef prompt (stripped in `getChefContext`) so it stays UI/capture-only.
- **Deviations from the imported mock (deliberate, all logged in scope-1E):** (a) **Add is a direct inline input**,
  not the chef sheet — #2 requires fixing a hard constraint without a conversation; (b) **added an "Eating" (dietary)
  field** to the soft card — the returning-user mock buried dietary in prose, but #2 needs every structured field
  directly editable; (c) **dropped `memory.edit`** — edit routes to Talk-to-Chef re-tell (gap #1); (d) **added undo**
  to every capture/remove toast (gap #2); (e) **softened** the "I fold older notes together" copy — dedup is out of
  1E (gap #3); (f) **omitted the decorative mic** — no speech API in scope, a dead control is worse than its absence.
- **Undo reuses existing mutations, no bespoke endpoint.** `user.talk` returns an `undo` payload (before-values of
  changed prefs + written/deactivated memory ids); the client reverses via `updatePreferences` + `memory.deactivate`
  / `memory.reactivate`. Memory-removal undo is optimistic (re-insert) to avoid a refetch race (found + fixed in E2E).
- **`isNew` = no prefs row AND no memories** — a returning user who dismissed every memory keeps their constraints
  and does not regress to "We've just met" (code-review edge fix).

**Phase 1E framing — Open-Question #2 resolved + You audit-surface design** (2026-07-22, Session 32)
- **AI-first capture, structured audit — split by data type (OQ#2 resolved).** Preferences are captured by AI
  (onboarding interview / Talk-to-Chef / implicit thumbs), never via a form; the You tab is the trust/verification
  surface, not the primary editor. Two field classes get different treatment: **hard constraints** (dietary
  framework, allergies/restrictions, household size, cook-time ceilings, cuisines) are AI-settable but **always
  directly editable** — a mis-remembered allergy is a real-world harm, so safety-critical values must be correctable
  without phrasing a sentence the model parses right; **soft memory** (dislikes, brands, behaviors) is an
  AI-captured, correctable ledger. Rationale: pure-AI fails the trust test, pure-settings fails the product thesis;
  the infra already *is* this hybrid (typed `user_preferences` + free-form `ai_memories`, both read by
  `getChefContext`). The realization that de-risks the phase: **the chef already personalizes** — 1E makes the loop
  visible/editable, it does not build the engine. (Supersedes the S3 "AI generates the UI" direction's open tail on
  preferences specifically.)
- **Chosen design direction: A — the chef's narrative read** (over the structured control-panel B). Leads with a
  prose summary of what the chef knows in its voice, then structured constraint cards + a memory ledger. Safety
  constraints are visually weighted (red "I never cook with", SAFETY-CRITICAL badge, allergy sub-labels). Imported
  from Claude Design (projectId `8bc73bfa-9683-4b44-ab06-40da9ec78590`, `You.dc.html`).
- **Memory correction = remove + re-tell, not inline edit (design's call, likely v1 behavior).** The mock's
  per-memory edit routes to Talk-to-Chef rather than an inline text field; removing a memory deactivates it
  (`isActive=false`) with an honest "your chef will stop cooking around this" confirmation. Leaning into this
  simplifies the backend (a `memory.deactivate` mutation covers v1; `memory.edit` may not be needed) and matches the
  AI-first thesis. Confirm at build.
- **1E build deferred to a clean session on Sonnet 5** (not this Opus scoping session): a full new-surface
  phase-build deserves its own context budget + the intended model, and the onboarding interview (#4) is still
  undesigned (its Pass-2 design must precede its build). The audit surface (#1/#2/#3/#5/#6) builds first.

**BUG-002 buy-unit consolidation + BUG-001 category fix (1D fast-follow)** (2026-07-22, Session 31)
- **A buy-unit table sits on top of the under-merge aggregator, never replaces it.** The aggregator under-merges by
  design (a wrong AI key can only *fail* to merge, never wrongly merge). BUG-002's duplicate rows are the cost of
  that safety. Rather than loosen the merge (which risks wrong merges), a curated table (`src/server/grocery/buy-units.ts`)
  keyed on the AI's `canonicalName` names the items a shopper buys as ONE thing and consolidates just those. It only
  ever *increases* merging for a hand-picked set and **can never merge two different items** — a wrong/unexpected
  canonicalName simply misses the table and keeps strict under-merge. Worst case of a table miss is the status quo
  (a duplicate row), never a bad merge. The safety property is unchanged; the table is additive.
- **Staples drop the measured quantity → one unquantified row** (Griffin's call). For buy-once items (salt, pepper,
  cooking oils, dried spices, vinegars) the tsp/tbsp figure is shopping noise — you grab the container. So a staple's
  lines collapse to a single row showing just the name; the per-meal amounts survive in the amber-dot breakdown
  (`sources`). Chosen over keeping a summed number ("Salt 3.25 tsp" helps no shopper). Two-way door.
- **Concrete buy-unit produce sums the buy-unit and absorbs off-unit amounts — no fake conversion.** carrot→lb,
  potato→lb, onion/tomato/bell pepper→count, etc. All lines collapse to one row in the buy-unit; amounts in that unit
  sum, amounts in other units fold into the same row (recorded in `sources`) but are **not** converted (the
  2026-05-26 "no LLM/fake arithmetic" rule holds — lb↔cup needs a density we don't have). When no line uses the
  buy-unit, the display unit falls back to a plain **count** if present (the legible shopping unit for this produce),
  else the mode unit — so "2 carrots + 0.5 cup" shows "2", never "0.5 cup". Bulk pantry goods whose amount DOES
  matter (flour, sugar, rice) are deliberately absent from the table.
- **BUG-001: `guessCategory` matches whole words, not substrings.** The optimistic quick-add category guess used
  substring `includes`, so "water"→"watermelon", "butter"→"butternut", "egg"→"eggplant" mis-homed for the ~1s before
  the AI tidy landed. Now whole-word (+ simple -s/-es plural) with an allowlist for intentional stems (`berr`) and
  multiword phrases (`ice cream`), plus added produce terms. A residual pre-existing keyword-ordering quirk
  (`ice cream`→dairy via "cream") is left alone (out of scope; self-corrects via tidy).
- **Two file splits under the 300-line rule, both re-export-preserving (zero caller churn):** the quantity parser
  left `aggregate.ts` (which was itself 312 > 300) into `quantity-parse.ts`, re-exported from `aggregate.ts`; the
  collect/sweep helpers left `grocery-generate.ts` (313 > 300) into `grocery-collect.ts`. No external import changed.

**BUG-004 closed — Phase D + background rate-limit class** (2026-07-21, Session 30)
- **Background AI fan-out gets its own rate-limit bucket.** The review-time `plan.normalizeSlot` is now a
  `bgAiProcedure` (new), not an `aiProcedure`. Rationale: the interactive 10-calls/min bucket is meant to stop a
  runaway *user-visible* client, but the walker legitimately fans out ~7 normalizes per week on top of ~7 hydrates —
  sharing one bucket would 429 the user-visible hydrate (→ stuck card, no auto-retry). `bgAiProcedure` uses a
  separate bucket (`AI_BG_RATE_LIMIT` = 30/min, key `ai:bg:${userId}`) and does NOT consume the 150/day budget (the
  recipe-generate that produced the recipe already counted; the derivative normalize shouldn't double-charge). A
  429 in the background bucket is harmless — `cacheSlotNormalization` is best-effort, so the recipe just re-normalizes
  at confirm. This is the general "interactive vs background AI work" split, not a special-case bump. Found by the
  Phase-D code review; the mock E2E couldn't surface it (limit relaxed to 1000 under the mock).
- **Real-model eval confirmed the load-bearing assumption.** Per-recipe normalization == the old batch's merge
  quality (identical rows/sums/merges; the scallion↔green-onion synonym canonicalized identically with no
  co-occurrence advantage). "Batching did no correctness work" is now verified, not assumed. The ~27–37s normalize
  is entirely off the confirm path.
- **Straggler hint over section-streaming (confirmed built).** `pendingRecipeCount` on `grocery.current` +
  "Finishing N recipes…" copy; early-confirm instrumentation logs `stragglers`/`normalizeMisses`/`confirmMs`. True
  server-side section-streaming (#2) stays deferred until that instrumentation shows early-confirm actually hurts.

**Generation-architecture rethink — BUG-004 (design + Phases A–C)** (2026-07-21, Session 29)
- **Normalize is cached on the RECIPE row, not the slot.** Corrects the S28 whats-next note ("cache on the slot").
  A leftover slot can share one recipe and a slot doesn't own ingredients; the recipe row owns `ingredients` and is
  immutable (`plan.modify` spins up a NEW recipe row rather than editing one), so a derived normalize cache next to
  it can never go stale. New nullable columns `normalized_ingredients` (jsonb, `NormalizedResult[]` aligned by index
  to `ingredients`) + `normalized_at`. Nullable ⇒ no backfill; old/pre-feature recipes self-heal via the confirm-time
  fallback, and plan-generated recipes cascade away with their plan anyway.
- **Normalize runs as a SEPARATE best-effort call at review time, decoupled from hydration** (my divergence from the
  architect memo, which put it inside `hydrateSlotRecipe`). Rationale: folding it in would delay a tapped recipe by
  the normalize time (~3–6s), regressing the read-while-reviewing flow that justified plan-time hydration. So
  `cacheSlotNormalization` + a `plan.normalizeSlot` procedure; the walker fires it right after each hydrate lands
  (non-blocking, concurrent with the next recipe-gen). A normalize failure is a no-op (cache stays null → confirm
  re-normalizes that one recipe). It never blocks the recipe/card going "ready".
- **Confirm reads the cache + normalizes only the residual.** `grocery.generate` uses a recipe's cache when present
  AND length-aligned with its ingredients; only cache-miss lines (stragglers swept at confirm, pre-feature recipes,
  or a recipe whose normalize hadn't finished) get one batched AI call. A fully-reviewed week ⇒ zero AI calls at
  confirm ⇒ the aggregate is instant. The `normalizing` phase is now conditional (shown only when there's a residual).
- **Under-merge remains the safety net for the cache.** A misaligned/partial cache drops the whole recipe to the
  residual batch (length check), and even a wrong cached key can only *fail to merge* (a safe separate row), never
  wrongly merge — same property as the batched path.
- **Straggler UX = instant confirm + an honest "Finishing N recipes…" hint** (Griffin). Confirm stays instant (no
  gating); the Groceries screen names the remaining work on the straggler path. **Loading scope = minimal now; defer
  true server-side section-by-section streaming (#2)** until instrumentation shows early-confirm actually hurts.
  Section-streaming would fake a progress bar for a task that (common case) finishes before it renders.
- **Ingredient caching (#3) is a later, separate follow-up** — a read-through household/global canonical cache
  *underneath* `normalizeIngredients` (it optimizes how expensive each call is; the recipe-row cache optimizes *when*
  normalize runs vs confirm — they stack). Its global-vs-household scoping is an open decision (see open-questions).

**Phase 1D closed + wrap decisions** (2026-07-21, Session 28)
- **Merge quality PASSED the soft DoD (#2) on the real model** (Griffin's eye). Sums exact, semantic
  canonicalization right (scallions == green onion), zero mis-merges (under-merge holds). 1D's hard V1 problem is
  solved for V1. Duplicate under-merge lines (salt/pepper "to taste", carrot lb+cup) accepted → buy-unit
  fast-follow (BUG-002).
- **Generation-architecture rethink is the next focus** (material, its own planning session). Direction locked:
  **normalize incrementally during plan review (#1)** so confirm runs only the instant pure aggregate, **+
  progressive/legible loading (#5)**, with **ingredient caching (#3)** as the follow-up. Trigger: a full-week
  normalize measured at 37.7s > the 30s timeout, and perceived confirm latency is too high regardless. Open to a
  more creative approach in the design pass. **Stopgap shipped 1D:** `ingredient-normalize` gets a per-call 60s
  (stream-tier) timeout so a full week doesn't error. Tracked as BUG-004.
- **Parked-bug tracker instituted** (`docs/bug-tracker.md`). Every parked defect = a tracked, reproducible,
  closeable entry (id + repro + severity + "address by" + status), reviewed each session. Distinct from
  idea-backlog (features) and open-questions (decisions). Wired into the session-end protocol. A standing rule.
- **Visual-QA capture harness extended to Groceries + Recipes** (was Plan-only). Layer-A capture specs +
  ground-truth facts per surface; `useHud:false` for tabs without a debug-HUD section. The visual layer now
  guards these surfaces against regressions, same as Plan.

**Recipes-tab reorg build decisions (#14)** (2026-07-21, Session 27)
- **Cooked harvest = lazy-on-read in `recipe.list`** (my call). "Confirmed slot whose date has passed" can't be
  stamped at plan.confirm (dates are future then) and there's no scheduler, so the harvest runs when the Recipes
  tab loads. Idempotent + guarded (only writes when the max past-slot date is newer than the stored
  `lastCookedAt`), non-fatal (try/catch — the list must render). Own tested function (`harvest-cooked.ts`).
- **Cook is a graduation → the harvest detaches too.** Stamping `lastCookedAt` also nulls `sourcePlanId`. Reason:
  a cooked-but-unfavorited plan recipe would otherwise cascade away when its plan is replaced, losing cooked
  history. Matches the recipes-schema "nulled on graduation (favorite/cook)" contract. *(Cooked history is durable.)*
- **Draft signal = `sourcePlanId != null`, not `sourceType`** (my call, deviates from the mock). The mock flips
  `source:'plan'→'ai'` on promote; real data keeps `sourceType` as honest provenance and uses the cascade FK
  (`sourcePlanId`) as the ephemeral-membership discriminator. Promote = null it. `plan_generated` maps to "AI" on
  the card (fixes the fall-through-to-"Manual" bug). Safe: nothing else keys drafts off `sourceType`.
- **Search-results presentation = flat, cross-tier** (resolves the brief's open question). A query switches the
  tiered view to one flat ranked list spanning all tiers (`recipe.search` already reaches every household recipe).
- **"+" create menu = Generate / Import URL only.** "Add manually" (in the mock's toast) has no flow and is out
  of 1D scope; deferred to the backlog.

**Slice D build decisions — staples + Talk-to-the-Chef** (2026-07-21, Session 26)
- **Cooked signal = auto from a past confirmed plan slot** (Griffin). `lastCookedAt` existed but nothing wrote
  it, so the Recipes reorg's "cooked" tier had no data source. Decision: a recipe is cooked when it is the
  recipe of a **confirmed plan slot whose date has passed** — fully automatic, no "I cooked it" tap (matches the
  scope's no-explicit-mark intent). The build stamps `lastCookedAt` at that moment (durable, not recomputed
  every read). Built with the reorg, not this session. *(Feeds scope #14.)*
- **Talk-to-Chef NL→ops ID-safety** (my design, per the plan's risk note). The `grocery-talk` model turns a
  request into `add`/`remove` ops + a one-line reply, but **never sees or emits a database id.** It references
  existing items only by a numbered `[N]` ref we assign in the prompt; the `grocery.talk` router resolves that
  number to a real id from the household's OWN list and bounds-checks it. A hallucinated/out-of-range ref maps
  to nothing and is ignored — it can't delete an unmentioned item or reach another household. Ops are add/remove
  only (no edit/check by voice in 1D); a hard 12-op cap bounds blast radius; adds dedupe against the list.
  Query-only asks ("what am I out of") return zero ops + the answer in the reply.
- **Staples are OFFERED, not auto-added** (confirms scope open-Q #2). The `staples` router manages the saved set
  (`list`/`add`/`setActive`/`remove`, add is idempotent-by-name so re-adding reactivates); the chip row shows
  active staples **not already on the list** (tapping optimistically adds → the chip disappears — the design's
  "dismiss" for free). A tap reuses `grocery.addItem` with the staple's curated category (no AI tidy — no
  needless spend) and `sourceType:"staple"` provenance (which `itemMeta` already renders). The list projection
  is untouched — staples never auto-fold into a generated list.
- **`TalkToChefSheet` relocated to `components/shared/`** (2nd consumer). It was already fully generic; moved
  out of `plan/` and given `placeholder` + `resultMessage` props so Groceries reuses it rather than duplicating
  (anti-duplication). Plan's one import updated; no behavior change for Plan.

**Slice C build decisions — the shoppable list** (2026-07-21, Session 25)
- **Drag-reorder uses `@dnd-kit`, touch-first — NOT the design's native HTML5 drag** (Griffin's call). Native
  HTML5 drag works on a desktop mouse but is effectively dead on touch, and this is a phone-first app. `@dnd-kit`
  drives reorder off a long-press-to-lift → drag → drop gesture (`TouchSensor` delay 200ms + `PointerSensor`
  distance 8 + `KeyboardSensor` for a11y) — the same interaction the eventual native app will have. **Griffin's
  framing:** build toward the phone; web is secondary and will be rebuilt for a good web experience later, so
  emulate the phone behavior now. `@dnd-kit` is the app's ONE drag solution going forward (reusable by any tab).
- **"Same architecture across the whole app" is a hard requirement** (Griffin). Slice C introduces **zero new
  patterns** beyond `@dnd-kit`: tRPC mutations (household-scoped, Zod, co-located tests), an optimistic-update
  hook modeled 1:1 on Plan's `use-plan-modify`, vaul for sheets, the `.glass-*` utilities, the shared category
  taxonomy. The grocery tab stays architecturally identical to Plan.
- **The Groceries design is NOT a new "design language" — it inherits the existing system** (same tokens, glass
  rows, eyebrow headers, glass tab bar, bottom sheets). What's genuinely new is grocery-*specific* interaction
  (one-zone check-off, inline merge-review), which is surface-specific, not app-wide. Griffin's related instinct
  is valid though: this is the highest-fidelity surface built so far, so a deliberate **"refresh Plan (and
  Recipes) visuals to the current bar"** pass is worthwhile — logged for **1F (polish/QA)**, NOT Slice C. (Recipes
  gets reorganized in Slice D and You-tab is built in 1E, so Plan is really the only tab needing a dedicated
  visual refresh.)
- **Quick-add tidy = client keyword guess + background AI refine.** The optimistic insert uses an instant
  client-side category guess (`guessCategory`, keyword map) so the item lands with no latency; a background
  `tidyItem` (`aiProcedure` reusing `ingredient-normalize` on one line) then refines category + canonical name.
  Non-fatal — a normalize miss leaves the item as typed. Honors the "background AI tidy" spec at ~one cheap
  gpt-4.1-mini call per manually-typed item. **Dedupe = client-side exact-name check + pill**; canonical/AI
  dedupe ("scallions" == "green onions") is deferred (V1.5, the catalog era).
- **`splitItem` = un-merge into one line per source, a direct `grocery_items` edit.** A multi-source row splits
  into N rows, each named after the item with that source's own qty/unit (parsed via the aggregator's
  `parseQuantity`), `sources` = the single source. No `mergeOverrides` — consistent with mid-week resync being
  deferred (#10). Single-source items are a no-op.
- **Router split for the 300-line rule.** The 7 new mutations live in `grocery-item-mutations.ts` +
  `grocery-organize.ts` as plain procedure objects spread into `groceryRouter`, so client call paths stay flat
  (`trpc.grocery.editItem`) while each file stays small. Shared test harness extracted to `grocery-test-utils.ts`.

**Slice B build decisions — the hybrid merge, resolving "no LLM arithmetic"** (2026-07-20, Session 24)
- **The AI's normalize outputs are GROUPING KEYS, never arithmetic.** The plan listed `numericQty` in the
  `ingredient-normalize` output *and* said the aggregator does the qty-string parsing with "no LLM arithmetic"
  (2026-05-26 rule) — an overlap. Resolved: `canonicalName` + `canonicalUnit` are used only to decide what
  merges with what. The safety property this buys is the whole point of under-merge (#6): a wrong AI key can
  at worst *fail* to merge two things (a safe separate row), never force an incorrect merge, because a bad key
  lands in a different bucket. **All arithmetic is pure code** parsing the recipe's own quantity strings
  (`aggregate.ts`: fractions, mixed numbers, unicode ½, ranges, "a pinch"→unquantified). The AI's `numericQty`
  is a **fallback only** — used for a lone line whose string the code parser can't read, and such a line is
  forced solo (confidence-gated) so its uncertain number is never summed with another. Kept in the schema per
  scope #5 + as the seam for the future buy-unit layer.
- **Amber = "summed across ≥2 meals," derived from `sources.length > 1` — NO new schema column.** Faithful to
  #6 ("the amber dot only means 'I summed this across meals — verify the count if you like'"). Under-merge
  routes uncertain lines to their own single-source rows (no amber); confident merges become multi-source rows
  (amber). So the persisted `sources` jsonb fully encodes the rendered amber state; Slice C derives it. Avoided
  drifting the migration-0004 schema.
- **Same-unit-only summing; ranges → higher end.** Per the deferred unit-conversion engine, 1D groups by exact
  `(canonicalName, canonicalUnit)` — cups vs tbsp for the same item stay two honest rows, no fake conversion.
  A range ("2–3 cloves") resolves to the higher end (buy enough, don't come up short).
- **`grocery.generate` is idempotent + race-safe via the `generationStatus` column as CAS token** (same trick
  as Slice A hydration): claim `pending|error → hydrating`; a double-fire from a re-mounted tab matches 0 rows
  and skips. `error` is claimable so retry re-runs the projection. Phases are checkpointed
  (hydrating→normalizing→aggregating→ready) so the tab's poll drives chef-voice copy. The write **replaces only
  `sourceType:"recipe"` items** so retries and any manual/staple items coexist. On failure the status column IS
  the error channel (record `generationError`, return — don't throw — so failure has one representation; the tab
  reuses Plan's stream-error card + one-tap retry).
- **`plan.confirm` stays fast** — a status flip + an empty `grocery_lists(pending)` (guarded so a re-confirm
  can't spawn a duplicate). The **Groceries tab** fires `grocery.generate` when it lands on a `pending` list, so
  confirm never blocks on generation.
- **The aisle taxonomy moved to `src/lib/grocery-categories.ts`** (client-safe, no Drizzle import) and is
  re-exported from `@/server/db/schema`. Lets the Groceries UI share the one category list + order without
  pulling the server schema into the browser bundle. Single source of truth, no duplication.

---

**Slice A build decisions — hydration CAS token + `recipe.get` convention** (2026-07-20, Session 23)
- **Hydration CAS uses the `recipeStatus` column, not `updatedAt`** (the plan said "CAS on `slot.updatedAt`").
  `defaultNow()`/seeded rows carry sub-millisecond `timestamptz` precision that truncates to ms when read into
  JS, so an `updatedAt =` equality guard would match 0 rows and hydration would silently never fire. An atomic
  `UPDATE … WHERE recipeStatus IN ('none','stale')` is a correct CAS token (a concurrent claim re-checks the
  just-committed row and matches 0) and the conditional write-back `WHERE recipeStatus = 'hydrating'` still
  catches a modify that intervened mid-generate. Same guarantees, no precision footgun.
- **`recipe.get` returns `null` on not-found; mutations throw `NOT_FOUND`** (resolves open-questions #3).
  The inconsistency is resolved *by rule* (queries null, mutations throw), not by making `get` throw. `null`
  is the right shape for the plan meal sheet's optional recipe fetch — a detached/deleted recipe falls back
  gracefully instead of dropping the query into an error state. Trivially reversible if we later want uniform
  throwing. Codified in a comment on `recipe.get`.
- **Hydration orchestration extracted to `plan-hydrate.ts`** (not inline in the router) to keep `plan.ts`
  under the 300-line rule and make the idempotency/CAS/write-back unit-testable without tRPC ceremony. Mirrors
  the existing `plan-modify` split.

---

**Phase 1D Groceries architecture — plan-time hydration + hybrid merge (reconciled)** (2026-07-20, Session 22)
- **Supersedes** the 2026-07-19 "expand-then-hydrate at confirm" entry that briefly sat here. That was a
  thinner re-derivation written when the earlier, more-thorough 1D plan (`~/.claude/plans/resume-meal-app-sorted-reddy.md`,
  2026-07-13, 4 decision rounds + system-architect + ux-design-critic) had been forgotten. The two plans
  were reconciled 2026-07-20; the authoritative plan is now `~/.claude/plans/rippling-herding-glacier.md`
  and the architecture memo `~/.claude/plans/resume-meal-app-sorted-reddy-agent-ab9e5e211025b4d32.md`.
- **The grocery list is a deterministic PROJECTION** (architect's organizing idea):
  `list = aggregate(recipes of the confirmed plan) + manual items + active staples`, re-runnable. In 1D it
  runs at confirm and re-runs only on retry; mid-week resync (re-running on a plan change) is deferred.
- **Recipes hydrate at PLAN TIME, in the background during review** (NOT at confirm) — client-orchestrated
  per-slot `plan.hydrateSlot` mutations, day-1-first, tap-to-prioritize, resumable, with a confirm-time
  server sweep for stragglers. Reason (the originating product insight): the wife wants to read full recipe
  detail *while evaluating* the proposed week; this also makes the list near-instant at confirm. Chosen over
  confirm-time batch-expand (which put a ~15s wait on the signature confirm tap and dropped the during-review
  recipe read). No `waitUntil`, no queue (over-engineering for ~7 calls while the user watches).
- **Hydrated recipes are real `recipes` rows** tagged `sourceType:"plan_generated"` + `sourcePlanId` (FK,
  cascade-cleans on plan replacement; detaches on favorite/cook). `plan.modify` must null `recipeId` + mark
  the slot `recipeStatus:"stale"` (fixes a latent bug: `toSlotValues` at `plan-types.ts:171` doesn't carry
  `recipeId`). Recipes-tab organizes by memory tier (cooked / deliberate library / plan drafts), derived
  from `isFavorite` + `lastCookedAt` + slot dates — no explicit "I cooked it" ever required.
- **Merge = HYBRID**: one batched `ingredient-normalize` AI call (canonical name, category, numeric qty,
  canonical unit + confidence) + a **pure deterministic aggregator** that does ALL the arithmetic (the
  2026-05-26 "code always in control; LLM never does the math" rule). Pure-deterministic dies on the
  semantic long tail; pure-AI would do arithmetic on a shopping list. The aggregator **under-merges** —
  when items are genuinely different (cherry ≠ roma tomatoes), it keeps them separate rather than merging-
  then-flagging.
- **Merge-review = INLINE** (Griffin's call): uncertain merges carry an amber dot in the live list; tap to
  expand the per-meal breakdown + "Split into separate items". **No required user action** — because the
  aggregator under-merges, every surviving merge is high-confidence and the dot means only "I summed this
  across meals, verify the count if you like." Rejected the review-pass overlay and the double-check strip
  (both make the user act on something usually-correct → alert fatigue).
- **Design (imported from Claude Design, projectId `8bc73bfa-9683-4b44-ab06-40da9ec78590`,
  `Groceries.dc.html`, saved to `docs/design/surfaces/groceries/imported.dc.html`).** As-built adds three
  things now IN 1D: **section reorder + item drag + a full manual/"notepad" mode** (Grouped↔Ungrouped
  toggle), and a **grocery "Talk to the Chef" sheet** (natural-language add/query) as a **secondary** add
  path (text quick-add is primary). Quick-add is top + bottom inline rows, NOT a bar docked above the tab
  bar → the earlier "blessed exception to the no-bottom-bar rule" carve-out is unnecessary.
- **Check-off = ONE ZONE** (Griffin's call): checking an item removes it from its section and drops it into
  a single collapsible "GOT IT" zone at the bottom. Not strike-in-place, not per-section sinking.
- **Deferred out of 1D** (Griffin's calls, keep MVP tight): **mid-week resync** (list update on a mid-week
  plan modify) + its ack pill + already-bought handling + the `mergeOverrides` persistence layer (inline
  "split" becomes a direct `grocery_items` edit instead); a **bespoke empty state** (the empty state is just
  the normal list with zero items + the add row); a **bespoke error state** (minimal retry reusing Plan's
  existing stream-error card). Also deferred per prior plan: buy-unit/package layer (fast-follow gated on a
  merge-quality eval), catalog/brand memory/autocomplete (V1.5+/Instacart; 1D builds only the canonical
  `name` vs `rawName` seam).
- **Schema deltas**: `meal_plan_slots.recipeStatus`; `recipes.sourceType += plan_generated` + `sourcePlanId`
  (reuse existing `lastCookedAt` for the cooked-harvest stamp — no new `cookedAt`); `grocery_lists.generationStatus`
  + `generationError` + `organizeMode` + `aisleOrder`; `grocery_items.sources` jsonb (multi-provenance;
  keep `sourceRecipeId` for back-compat) + `packageLabel` (dormant until the buy-unit fast-follow). Full
  detail + build slices in `~/.claude/plans/rippling-herding-glacier.md`.

**Claude Design supersedes Figma Make as the design iteration tool** (2026-07-13, Session 20)
- Claude Design (Anthropic, claude.ai/design) becomes the default design partner; the Figma Make operating model (2026-03-29, above) is retired. Canonical workflow: `docs/design/design-workflow.md`.
- Rationale: our design system lives in CODE (globals.css + shipped components), which Claude Design reads directly — collapsing the Figma 4-hop dance (Claude writes Make prompt → Griffin pastes → generates → Claude reads via MCP → re-implements) to 1 hop (Griffin iterates against our real system → hands a URL back → Claude builds). No designer on the team, so Figma's pixel-precision tooling was unused cost. Figma shares dropped ~7% on Claude Design's launch — the market read it as a direct challenge; for a code-is-the-product, no-designer team the fit is stronger still.
- **Mechanics:** Code→Design via the `DesignSync` tool (project `Meal App Design System`, id `eb7a2cae-e0e4-4931-af36-a5ff8995ad53`, synced from `docs/design/system/**`); Design→Code via `import-claude-design-from-url` (Vercel plugin).
- **The gate (how Claude uses it):** whenever work is visual, Claude OFFERS a design pass with a recommendation + what it buys + where returns diminish — never silent-skip, never auto-run. New surfaces = strong recommend; in-pattern additions = lean skip (visual-qa catches drift). Griffin decides. (His directive, 2026-07-13.)
- **Boundary:** this does NOT define the design system — the deliberate 1F design-system pass (2026-07-09 decision) stands; the DS project is a descriptive snapshot of shipped vocabulary, and 1F will run IN Claude Design then re-sync.
- **Fallback ladder:** Claude Design → inline Artifact mock (real tokens) → Figma MCP escape hatch (registration retained, not removed). Retire Figma after 1D proves the loop.
- **Refinement (2026-07-19, S21) — ported from FFOS, which battle-tested this first:** (1) **Structure = ONE plain app project** (Griffin creates it in the claude.ai UI, GitHub-connected, carries `docs/design/PROJECT-CONTEXT.md` + every design chat as accruing memory) — NOT a per-screen project, and NOT the separate DesignSync design-system project (that's now dormant/optional; the one-app-project + GitHub + PROJECT-CONTEXT model is what actually works, so we dropped the bundle-push as load-bearing). (2) **Round-trip SOLVED:** `import-claude-design-from-url` REJECTS the pasted app URL (Cloudflare-gated); the working method is `DesignSync.get_file(projectId parsed from the URL, path="<name>.dc.html", +→space)` → extract `content` → save to `docs/design/surfaces/<surface>/`. (3) **New artifact: `PROJECT-CONTEXT.md`** — the read-me-first product+tokens distillation (FFOS's highest-leverage piece). (4) **Design system is NOT baked** (Griffin asked): meal-app has a real bespoke vocabulary today (unlike FFOS's near-stock shadcn) but the deliberate consolidation is still the 1F pass; the Claude Design loop is the living venue to evolve it, PROJECT-CONTEXT is the living token pin.

**Release tracking: file-based hub-and-spoke; Linear deferred with explicit graduation triggers** (2026-07-10, Session 19)
- `docs/scope-v1.md` is the Release 1 hub (phase spine 1A–1F, per-phase checklists, release DoD, out-of-scope, post-MVP gate); `docs/scope-<phase>.md` is the active phase's detail spoke. The hub is linked at every session start with a ≤6-line scope check (release position, roadmap position on the V1→V4 arc, deltas, open calls). Anti-sprawl: the hub changes only on status flips/scope changes/DoD progress; phase docs carry the churn.
- **Linear explicitly considered and deferred.** Its case: kanban/mobile views, notifications, proper issue states. Files' case: Claude reads docs natively every session (no dual bookkeeping), git-versioned history, single stakeholder, zero new tooling. **Graduation triggers that flip this decision:** a second human contributor; >2 concurrent workstreams; Griffin wanting mobile/notification visibility into progress; backlog-grooming pain (~100+ active items). If triggered: mirror the hub into a Linear project (phases = milestones, features = issues; one-time MCP auth).
- Griffin's channel preference: he'll usually give scope feedback verbally rather than editing the docs; Claude applies his words to the doc. Direct checkbox/comment edits remain supported and are picked up at session start.

**Release 1 boundary: solo-user MVP** (2026-07-10, Session 19)
- R1 = phases 1A–1F, the full solo loop (recipes → plan → groceries → preferences/memory/onboarding → polish). The Session-9 cuts are CONFIRMED: household sharing UI, realtime sync, and cook mode → V1.5. Household **infrastructure** (household-scoped schema, RLS) stays in R1.
- Rationale: matches what has actually been built since S9; sharing UI would add invite flow + Supabase Realtime + conflict handling to 1E/1F and delay the MVP. Validation story (Griffin + wife) works with solo accounts.
- Reconciliation: the master plan's V1 section still said sharing is in-V1 — a dated note now points to this decision and to `docs/scope-v1.md` as the operational scope. Post-MVP gate defined in scope-v1.md ("After MVP" section).

**Per-phase scope docs (`docs/scope-<phase>.md`) + a session scope ritual** (2026-07-10, Session 18)
- Every phase gets a scope contract: milestone goal, in-scope features with acceptance criteria, explicit out-of-scope with destinations, and a scope change log. Session protocol now opens with a scope check (goal, done vs remaining, items awaiting a call) and closes by updating the doc. Nothing gets built that isn't in the scope doc; scope changes are fine but land as change-log lines, not drift.
- Rationale: Griffin flagged a visibility gap — a strategy layer (roadmap/master plan) and a session layer (whats-next) existed, but nothing in between showed the comprehensive picture of a milestone, so scope lived in his memory + Figma briefs. Contributing factor discovered same session: the meal-app master plan (and 3 other plan files) had been accidentally deleted from `~/.claude/plans/` (uncommitted working-tree deletions — recoverable via git). Chose a file-based scope doc over Linear: two-person shop, docs are read by Claude every session, tickets fragment scope. Linear is the graduation path if parallel workstreams make files fail.
- First instance: `docs/scope-1C.md` (Plan tab), seeded from the S18 built-vs-planned inventory.

**Plan/modify prompt hardening: chips are verb-first actions; titles never echo the request** (2026-07-10, Session 18)
- Chips must be imperative, tappable ACTIONS ("Make it spicier"), never bare attributes ("light", "iron-rich" — those belong in tags), and never offer a quality the dish already has. Modify may not bolt the request's wording onto a title ("Iron-Rich Grilled Steak Salad" banned — change the dish, acknowledge in chefResponse). Prompt tests pin all three rules (deliberate-review guard per ai-pipelines rule).
- Rationale: Griffin's live plan showed fresh generations still drift to attribute chips (confirming the S15 hypothesis), and a chip tap produced a literal retitle. Chips render as full-width action buttons in the expanded sheet, so a bare adjective reads especially badly.
- Verification note: AI-output quality verifies on fresh generations over time, not E2E (harness uses fixtures). If drift persists: few-shot examples, then a stronger model for plan tasks.

---

### E2E Testing Harness (Session 17, 2026-07-09)

**AI mock lives server-side at the model layer, NOT Playwright `page.route`** (2026-07-09)
- `getModel()` returns a `MockLanguageModelV3` (`ai/test`) under `E2E_AI_MOCK=1`, so the whole real pipeline (validation, persistence, tRPC serialization, invalidation) runs against fixtures.
- Rationale: browser interception leaves the DB inconsistent with the UI (the client refetches server state after streaming, so a "did the plan replace?" assertion falsely fails) and would force forging serialized payloads. Double-gated (`&& !VERCEL`); the flag lives only in playwright.config.

**E2E server uses `next build && next start`, not `next dev`** (2026-07-09)
- Rationale: Next 16 blocks a second `next dev` from the same directory (Griffin often has one running); a prod build also avoids dev compile flakiness. `E2E_REUSE_BUILD=1` skips rebuild for fast iteration.

**Test isolation = a guarded "E2E Test Kitchen" household in the real Supabase project, not a separate DB** (2026-07-09)
- Rationale: self-bootstraps in any repo using its own env vars (portable to FFOS/Leila with zero manual DB setup). A guard refuses to write unless the resolved household matches the sentinel name with the test user as sole member. Escape hatch: move to an isolated DB later if data sensitivity warrants.

**E2E is a relevant-change + wrap-time gate, not a per-commit hook** (2026-07-09)
- Rationale: needs a build and is minutes-slow with Plan-tab-only coverage; per-commit would wreck the commit-early rhythm. Wired via CLAUDE.md + `.claude/rules/plan-e2e.md`. The fast gauntlet stays the commit gate.

---

### Product Decisions

**Target user for V1: Solo health-conscious adult** (2026-03-28)
- Rationale: Griffin's own profile. Household/family features deferred to V1.5. Keeps V1 scope tight.

**Phasing: V1 -> V1.5 -> V2 -> V3 -> V4** (2026-03-28)
- V1: Recipe capture + meal planning + grocery list (the core loop)
- V1.5: Light pantry + household sharing
- V2: Grocery ordering + photo/social import + aisle mapping
- V3: Health coaching + nutrition + smart reordering + restaurant guidance
- V4: Native mobile (iOS then Android)
- Rationale: Validated by research — prove the core loop before layering complexity. Pantry and cart integration are high-risk and should be progressive.

**AI interaction model: "AI generates the UI"** (2026-03-30, evolved from 2026-03-28)
- Not chat-first. Not static UI with AI bolted on. The AI dynamically assembles personalized interfaces based on user context, history, and intent.
- The system comes to the user with a proposal (pre-populated meal plan, suggested recipes, etc.) — user reacts, tweaks, and confirms rather than creating from scratch.
- Gets faster over time: Week 1 asks questions, Week 12 presents a near-ready plan.
- Modifications are conversational when needed (natural language input, voice dictation), but the primary interaction is reviewing and adjusting AI-generated proposals.
- Evolution: Started as "contextual AI everywhere" (Session 1) → debated "chat-first" (Session 2) → pushed back on chat-first due to speed/repeat-use concerns → landed on "AI generates the UI" (Session 3).
- Rationale: Differentiates from every competitor (all use static UIs). Avoids ChatGPT-clone feel. Aligns with agentic "get it done" vision. The risk is high (harder to build, AI must be good or experience feels broken) but the differentiation is real.

**Monetization: Freemium** (2026-03-28)
- Free trials and/or investment-locking to drive subscription
- Details TBD in later phases

**Working name: "meal-app"** (2026-03-28)
- Branding/naming deferred to later

**Phase 0 is Discovery & Design, not code** (2026-03-29)
- No code gets written until Phase 0 exits
- Phase 0 = competitive deep-dives, Figma wireframing/prototyping, resolving open design questions, lightweight technical spikes only
- Exit criteria: approved Figma prototypes, AI interaction model decided, all open questions resolved
- Rationale: Griffin wants proper discovery before development. Design and product decisions should be validated through prototypes, not built-then-revised.

**Household sharing (dual account ownership) in V1, not V1.5** (2026-03-29)
- At least two-person account sharing (partner/roommate) in V1
- Shared recipe library, meal plan, and grocery list with real-time sync
- Rationale: Griffin flagged this has deep infrastructure implications (auth, data scoping, real-time sync, conflict resolution) that are much harder to retrofit. Building single-user first and adding sharing later would mean significant rework.
- Future impact: This means Phase 1 infrastructure must include household data model, real-time sync setup (Supabase Realtime), and multi-user auth from day one. It also means V1 UI needs to handle shared state (e.g., both people editing a grocery list simultaneously).

**Core product principle: Nail before expanding** (2026-03-29)
- Nail 1-2 core flows perfectly before adding features. The feature list will spiral — capture ideas in the backlog but resist building until current flows are proven.
- Rationale: Griffin recognizes the feature brain dump is already large. Discipline is key for a long-running build.
- How to apply: Check Griffin (and ourselves) on scope creep. Every feature proposal gets asked: "Is this making the core flow better, or is it scope creep?"

**Figma as design tool with MCP integration** (2026-03-29, refined 2026-03-30) — ⚠️ SUPERSEDED 2026-07-13 by "Claude Design supersedes Figma Make" (below); kept as historical record.
- Figma Make for wireframing and prototype generation from text prompts
- Figma MCP Server to bridge Claude Code (context) and Figma (design)
- **Operating model (researched 2026-03-30)**: Claude Code = brain (all product context). Figma Make = design hand. `Guidelines.md` = bridge document.
  - Claude Code generates a `Guidelines.md` + structured first prompt for each Make session
  - Griffin pastes Guidelines.md into Make's code editor and uses the prompt to generate
  - Iterate visually in Make (3-5 rounds), come back to Claude Code for strategic questions
  - Claude Code reads Make outputs via `get_design_context` MCP tool
  - Can create a Make template with Guidelines.md pre-loaded to avoid re-pasting
- **Key limitations**: Make files are file-scoped (no org-wide shared context). MCP can read Make files but only write to Design files. ~50-70 prompts/month on Pro plan (3,000 credits). Multiple short guideline files beat one large file.
- **Sequencing**: Guidelines.md will be written AFTER IA and competitive taste profile are locked — not before.
- Rationale: Griffin has Figma Pro. Research confirmed Guidelines.md is the optimal context bridge. Writing it prematurely wastes Make credits on designs that will change.

**Design direction: Crouton + Flighty inspired** (2026-04-05)
- Dark mode first. Crouton/Flighty-inspired design patterns: clean typography hierarchy, limited color palette (1-2 accent colors), smart inline features, no cheesy graphics/emojis/celebration animations.
- Web V1 aims for the *spirit* of these apps (patterns, feel, principles) without needing pixel-perfect liquid glass polish. That comes with native iOS.
- Primary reference: Crouton (recipe-domain baseline). Secondary: Flighty (quality bar, data-dense-but-airy feel). Tertiary: Robinhood (illustration style, IA model), Mela (minimalism), Function Health (AI interaction flow).
- Anti-references: Cooklist, Mealime, Samsung Food — everything "cheesy," "amateurish," or "childish."
- Rationale: The entire competitive set looks amateur. Design sophistication is a legitimate differentiator that expands the addressable market beyond "utilitarian home cooks." Griffin's aesthetic preferences are strongly held and consistent.

**Platform sequencing confirmed: Web-first** (2026-04-05)
- Web app (phone form factor) for V1 to validate the AI planning flow.
- Design will use Crouton/Flighty *patterns* without needing native-level liquid glass polish.
- Native iOS investment comes later when product is validated and potentially a designer is involved.
- Rationale: Faster iteration, no App Store friction, API-first architecture means iOS is a frontend swap not a rewrite. V1 is for Griffin + wife — product validation matters more than pixel polish.

**AI interaction surface: Not a dedicated tab** (2026-04-05)
- AI is the UI, not a separate surface. No dedicated "Chat" or "AI" tab like Function Health.
- The bottom card/sheet pattern from Flighty is a tool in the toolbox if we need a persistent AI surface that comes and goes, but it's not a design requirement.
- This reaffirms the "AI generates the UI" decision (2026-03-30) and rules out a Function Health-style AI chat tab.
- Rationale: The whole point of "AI generates the UI" is that every screen IS AI-generated. A separate chat tab implies AI is an add-on, which contradicts the core interaction model.

**AI interaction surface paradigm: "Content IS the Conversation"** (2026-05-26, builds on 2026-04-05 and 2026-03-30)
- The plan screen (and all screens) use a layered interaction model:
  - Primary (70%): Direct manipulation on AI-generated cards — swipe, tap, chip selection
  - Secondary (20%): "Talk to the Chef" — a named, visible free-form input surface on the hero card for natural language intent (replaces generic "Make changes" or chat bars)
  - Tertiary (10%): Structured multi-turn clarification through tappable option cards (not chat)
- The AI's voice runs through the output: plan-level summary, card-level rationale, change-level acknowledgment. Brief, specific, woven into UI — not a separate conversation thread.
- Screen adapts to state: no plan → input-led; plan exists → plan-led with input accessible.
- Validated by: (1) ChatGPT deep research on AI-native UI paradigms (reference/ai-native-design-research.md), (2) alignment with Samsung Food, Jow, Instacart Smart Shop patterns, (3) pushes beyond research with generative meals, live transformation, AI-generated situational chips.
- Eliminates: sparkle FAB, persistent chat bar, generic AI buttons.
- Preserves: free-form natural language input, voice dictation, AI personality, multi-turn intelligence.
- "Talk to the Chef" is a working label — final naming TBD.
- Rationale: Balances Griffin's push for innovation (no generic AI chrome) with the practical need for unstructured input (complex multi-constraint requests are genuinely faster via dictation than card manipulation). The AI generates structured output regardless of input method, so cards and free-form aren't competing — they're different entry points to the same plan.
- Future impact: This paradigm must scale to all four tabs (Plan, Recipes, Groceries, You). The "Talk to the Chef" concept and card-level rationale lines become reusable components. The structured multi-turn pattern (option cards for clarification) becomes a system-wide interaction.

**Recipe discovery: AI-generated suggestions + import, not a catalog** (2026-04-05)
- No built-in recipe catalog or infinite scroll browse experience.
- Recipe discovery is: (1) AI-generated suggestions personalized to user, (2) import from share menu (Instagram, Safari), (3) URL import, (4) natural language search ("something light with salmon for Thursday"), (5) recipe library (saved/generated/imported) with strong recents.
- Rationale: Griffin's own behavior confirms he doesn't browse recipe catalogs. He asks AI or searches for specific things. His wife shares from Instagram. Building a catalog would compete with NYT Cooking's photography budget and isn't differentiated.
- Future impact: This means we need excellent recipe import (share target on iOS is critical), strong AI generation quality, and good recents/library UX. We do NOT need a content team, recipe partnerships, or a recommendation engine based on a catalog.

**Information Architecture: Plan | Recipes | Groceries | You** (2026-04-12)
- Four tabs, four nouns. Each tab owns a core object.
- **Plan** — the landing screen. AI-generated weekly meal plan, contextual to time of week. The AI input bar here doubles as the general "talk to your chef" surface. Absorbs: weekly planning, AI proposals, dinner parties, leftover intelligence, freshness warnings, batch prep coaching, weekly review, quick win suggestions, collaborative planning, weekly nutrition summary (V3), general AI queries.
- **Recipes** — personal cookbook. Recents at top (NYT Cooking pattern). AI-powered search bar. All import methods (URL, photo, social, share menu). Cook mode is an immersive overlay accessed from recipe detail, not a tab. Absorbs: library, import, AI generation, search, cook mode access, ingredient detail pages, skill progression.
- **Groceries** — the shopping list + pantry (V1.5+) + checkout (V2+). Auto-synced from Plan (no manual sync step). Check-off for in-store use. Pantry is a section/toggle within Groceries (not its own tab) because "what I have" is the flip side of "what I need." Absorbs: shopping list, pantry, ordering/checkout, aisle mapping, spending analysis, staples/reordering, barcode/receipt scanning.
- **You** — preferences, memory audit, household management. Rarely accessed — the backstop, not the primary experience. Absorbs: dietary preferences, memory audit, household/family profiles, store account linking, account/settings.
- **AI input bar** appears on every tab, contextual to the screen. On Plan it's the general "ask your chef anything" surface. On Recipes it searches/generates. On Groceries it adds items via natural language. Voice dictation available everywhere.
- Rationale: Stress-tested against every feature in V1 through V4 plus all unphased ideas. No feature requires a 5th tab or restructuring. "Home" was rejected because it becomes a junk-drawer dashboard that dilutes the core experience. "Plan" bounds scope clearly (everything relates to what you're eating) while the input bar expands it to general queries. Pantry fits inside Groceries. Cook mode is an overlay from recipe detail. Matches Robinhood's 4-tab-with-depth model.
- Future impact: V1.5 pantry adds a section to Groceries. V2 ordering adds checkout flow to Groceries + store setup to You. V3 nutrition adds cards to Plan and recipe detail. No IA changes needed.

### Technical Decisions

**Architecture: API-first via tRPC** (2026-03-28)
- All core business logic goes through tRPC API layer, NOT Server Actions
- Rationale: Multi-client requirement (web -> iOS -> Android). tRPC gives end-to-end type safety and can later serve mobile clients via standalone server or OpenAPI spec. Server Actions create a monolithic web app that can't serve native clients.

**Tech stack** (2026-03-28)
- Next.js (App Router) + TypeScript
- tRPC v11 for API layer
- Supabase (Postgres + Auth + Realtime + Storage)
- Drizzle ORM for database
- shadcn/ui + Tailwind CSS for UI
- Anthropic Claude API for AI service layer
- Vercel for deployment
- Rationale: Griffin already uses this stack (minus tRPC) in budget-app. Minimal new learning. Supabase ecosystem covers auth, realtime, and storage needs.

**Recipe data model: Versioned documents with JSONB** (2026-03-28)
- Recipes store ingredients/steps as structured JSONB in Postgres
- Version history via parent_id linking (AI modifications create new versions, originals preserved)
- Rationale: Users need to modify recipes without losing originals. Research shows recipe loss/disappearance is a major trust breaker.

**Household data model from day one** (2026-03-28)
- Every entity (recipes, plans, lists, pantry, preferences) belongs to a household
- Rationale: Even though V1 is single-user, the data model must support multi-user from the start to avoid painful migration later.

**Phone-form-factor web app** (2026-03-28)
- Max-width 430px centered on desktop, full-width on mobile, bottom tab navigation
- Rationale: Designing for eventual iOS port. Web app should feel like a phone app.

**Project structure: Single Next.js app, not monorepo** (2026-05-26)
- Clean internal separation: `src/server/` (tRPC + DB + AI) vs `src/app/` (frontend). Not Turborepo.
- When mobile arrives (V4), extract `src/server/` into a standalone tRPC server. Mechanical refactor, not rewrite.
- Rationale: Monorepo adds 1-2 weeks of setup for V1 web-only. The clean separation makes future extraction easy.

**Auth: Google SSO + magic link from V1** (2026-05-26)
- Consumer app — Google SSO is table stakes for conversion. Magic link as email fallback.
- Apple Sign-In deferred to iOS build (V4).
- Rationale: "Enter email → check inbox → find link → click it" kills consumer conversion. Most consumer apps see 50-70% Google SSO adoption.

**Household sharing: Infrastructure only in V1** (2026-05-26, refines 2026-03-29 decision)
- Every table has `household_id` (data model is multi-user ready). Single-user in V1.
- Full sharing UI (invite, real-time sync, conflict resolution) deferred to V1.5.
- Rationale: Core loop validation first. The hard part (data model) is done; the UI is additive.
- Future impact: No Supabase Realtime in V1. Adding it in V1.5 is a UI + subscription build, no schema migration.

**Cook mode: Deferred to V1.5** (2026-05-26)
- Recipe data model supports it (structured steps with timers in JSONB).
- Rationale: Not in the core loop (no idea → plan → grocery list). Data model supports it; it's a UI layer to add later.

**Analytics: PostHog** (2026-05-26)
- Open source, best Next.js integration, 1M events/month free, low vendor lock-in.
- Vendor abstraction layer (`analytics.track()`) built in Phase 1; PostHog SDK installed in Production Readiness phase.
- Rationale: Evaluated PostHog, Mixpanel, Amplitude, Vercel Analytics, custom Supabase, Segment. PostHog wins on open source + breadth of free tier + Next.js SDK quality.

**Error tracking: Sentry** (2026-05-26)
- Free tier: 5K errors/month. Official Next.js SDK.
- Installed in Production Readiness phase, not Phase 1.
- Rationale: 2 users (Griffin + wife) don't need Sentry. Install when preparing for wider release.

**LLM integration: Structured output tool, not an agent** (2026-05-26)
- Deterministic code always in control. LLM generates structured data (Zod-validated JSON). Our code validates, processes, and writes to DB.
- LLM never queries database, controls navigation, or acts autonomously.
- Rationale: Reliability (Zod catches garbage), security (LLM can't access unauthorized data), testability (mock LLM, test everything else), swappability (change providers by changing one adapter).

**Memory system: Dual approach** (2026-05-26)
- Structured `user_preferences` table (dietary framework, restrictions, cook times) for the settings UI.
- Unstructured `ai_memories` table (text log with category, confidence, source_type) for behavioral signals.
- No vector store in V1 — recency + category filtering sufficient for hundreds of memories.
- Rationale: Structured data for what users configure explicitly. Unstructured data for what the AI learns implicitly. pgvector added in V2/V3 when memory corpus grows.

**Supabase new API keys** (2026-05-27)
- Use new publishable (`sb_publishable_...`) and secret (`sb_secret_...`) keys, not legacy JWT-based anon/service_role keys.
- Drop-in compatible with `@supabase/ssr` and `@supabase/supabase-js`. No code changes needed.
- Rationale: Legacy keys will be removed late 2026. New keys support instant rotation and audit logging.

**Database connection: Transaction pooler** (2026-05-27)
- Using Supabase's PgBouncer transaction pooler (port 6543), not direct or session pooler.
- `prepare: false` set in postgres client config (required for pooled connections).
- Rationale: Vercel serverless creates a new connection per request. Transaction pooler multiplexes short-lived connections onto a shared pool. Direct connections would exhaust Supabase's connection limit.

**Auto-onboarding via ensureOnboarded mutation** (2026-05-27)
- `user.ensureOnboarded` tRPC mutation creates user + household + membership on first login.
- Uses `authedProcedure` (checks Supabase session only, no household membership required).
- Called from `OnboardGuard` client component in the `(app)` layout.
- Full AI-guided onboarding interview deferred to Phase 1E.
- Rationale: Simplest path to working auth. The database records must exist before any `protectedProcedure` call works.

**AI provider abstraction: Vercel AI SDK v6** (2026-05-27)
- Use the Vercel AI SDK (`generateObject`/`generateText`/`streamObject`) rather than a hand-rolled provider abstraction. Our `src/server/ai/index.ts` wraps it with retry + logging; `config.ts` maps each AI task to a model.
- Rationale: The SDK already implements our exact designed interface (`generateStructured`/`generateText`/`generateStream`), with Zod structured output, streaming, retries, and one-line provider swaps. Building custom would be a worse reimplementation. Validated against system-architect reasoning ("don't build infrastructure you can buy").

**Primary LLM: OpenAI gpt-4.1-mini** (2026-05-27, supersedes Gemini-first prototyping plan)
- All recipe tasks route to `gpt-4.1-mini` via `config.ts`. Switched from Gemini (the prototyping key had depleted credits).
- gpt-4.1-mini was already identified in `technical-research.md` as the likely production workhorse (best structured-output guarantees, ~$0.0015/recipe). Per-task model routing remains available for future tuning.
- **OpenAI strict structured output caveat**: rejects Zod `.optional()` fields and min/max/maxItems keywords. The AI schema in `tasks/types.ts` uses `.nullable()` (no min/max); `validateAiRecipe` does bounds-checking/sanitization after generation; normalizers convert nullable → clean DB shape.

**Recipe images: text-forward for V1** (2026-05-27)
- No hero-image generation or storage in V1. Recipe cards/detail are text + metadata.
- Rationale: image generation adds cost and complexity without validating the core loop. Revisit in polish/V1.5.

**Proxy does cookie-presence routing only; real auth in tRPC** (2026-05-27)
- `src/proxy.ts` / `updateSession` checks for the `sb-*-auth-token` cookie to decide login redirects. It does NOT call `supabase.auth.getUser()`.
- Rationale: In Next.js 16's long-lived Turbopack proxy runtime, creating a Supabase server client and calling `getUser()` deadlocks after the first request (accumulating auth-lock state) — it hung the whole dev server. Real auth verification already happens server-side in every tRPC `protectedProcedure`, so the proxy only needs coarse routing. Defense-in-depth, and can't hang (no network call).
- Future impact: if server components ever need fresh session tokens, revisit token-refresh strategy (the Supabase browser client refreshes client-side today).

**AI URL import: direct fetch → Jina Reader fallback** (2026-05-27)
- `parseRecipeUrl` tries a direct browser-headed fetch first; on 403/401/block it falls back to Jina AI Reader (`https://r.jina.ai/<url>`), which runs a real headless browser and returns clean markdown.
- SSRF-hardened: protocol allowlist + DNS resolution + private-IP blocklist + manual redirect re-validation, all before fetching. User content from scraped pages is wrapped in `<untrusted_page_content>` delimiters in the prompt.
- Rationale: major recipe sites (AllRecipes, etc.) block server-side fetches via Cloudflare; headers alone don't fix it. Jina is free/no-signup and purpose-built for LLM ingestion. Swap to Firecrawl (paid, more robust) later if needed.
- Accepted risk: DNS-rebinding TOCTOU between validation and fetch is not fully mitigated (full IP-pinning breaks SNI and is overkill for a 2-user app).

**AI prompt structure: static system prompt, user context in delimited user message** (2026-05-27)
- The personal-chef system prompt is static (role, food-safety, output rules). Per-user data (dietary framework, restrictions, dislikes, memories) is passed in the user message wrapped in `<user_context>`.
- Rationale: enforces the `ai-pipelines.md` rule (user content never interpolated into system prompts). Free-text memories are user-derived and could carry injected instructions — keeping them at user privilege (not system) prevents a poisoned memory from issuing system-level commands. Flagged by both `/review` and `/codex-review`.

### Phase 1C: Plan Tab Decisions (2026-05-28)

**Plan generation produces lightweight "meal concepts," not full recipes** (2026-05-28)
- Generating a week produces ~5 lightweight meal concepts per slot (title, one-line rationale, ~6 ingredient-preview pills, cuisine/effort tags, est. time), NOT full recipes. Full recipes (real quantities, steps, timers) are generated lazily by the existing 1B recipe pipeline at two boundaries: (1) batch-expand the whole week **on confirm** ("Looks good"), which feeds the grocery list; (2) expand a single meal **on cook** if not already expanded.
- Rationale: fidelity should be generated at the moment of *commitment*, not the moment of *consideration*. During planning the user is browsing/swapping/regenerating — cheap disposable concepts are the right fidelity. Full generation per slot at plan time would be 5–7× the tokens/latency (blows the 7–20s budget), and most generated recipes are swapped or skipped (wasted spend). Concepts are cheap to throw away; full recipes are expensive to throw away — which is exactly the "things change" risk. The work doesn't disappear, it relocates to the confirm boundary (where the grocery list needs real quantities anyway) and the cook boundary. Mirrors how a chef works: sketch the week loosely, then write the actual recipes/shopping list once the week is locked. Also keeps the Recipes library clean (un-cooked concepts don't pollute it) and scales to future "pre-draft next week" without burning speculative generations.
- Future impact: requires extending `meal_plan_slots` with concept columns (title, description, ingredientPreview jsonb + Zod, tags, estTimeMinutes, list-view chips). `recipeId` stays nullable, populated only on lazy expansion. Migration + RLS CI check required. Confirm flow gains a batch-expand step ("building your list…").

**Plan scope: dinners only for V1** (2026-05-28)
- The weekly plan generates dinners only in V1. The `meal_type` enum already supports breakfast/lunch/snack — adding them later is generator config, not a migration.
- Rationale: every Plan-tab design shows dinners; the North Star is "what's for dinner"; breakfast/lunch are lower-value, higher-noise (repeated/ad-hoc). Keeps the generation schema and token budget tight.

**Plan generation streams from the start (route handler + AI SDK), not a fast-follow** (2026-05-28)
- Plan generation is built streaming-first: a dedicated Next.js route handler (`src/app/api/plan/stream/route.ts`) returns `streamObject(...).toTextStreamResponse()`; the client consumes it via `experimental_useObject` from `@ai-sdk/react` (to be installed). The handler replicates `protectedProcedure`'s auth (Supabase `getUser` + household resolution) and persists the plan + slots transactionally on stream finish; the client then settles onto the canonical persisted plan via a tRPC `plan.current` refetch. Modify/confirm/feedback stay in tRPC.
- **Rule carve-out (deliberate, documented):** AI *generation streaming* endpoints may live as route handlers. All other DB mutations stay in tRPC. The "all mutations through tRPC" rule's intent (centralized auth, no direct DB from components, Zod-validated writes) is preserved because the handler reuses the same auth + Drizzle + validation server-side.
- Rationale: generation is 7–20s on the signature screen — a static spinner is unacceptable, and watching the week materialize is on-brand for "AI generates the UI." Griffin chose streaming-first over the de-risked plain-first sequencing (accepting a slightly slower path to M3) because the materializing-week experience is core, not polish. The route-handler mechanism is the well-trodden AI SDK path; tRPC-native partial-object streaming (httpBatchStreamLink + async generators) was rejected as awkward with superjson.

**Plan cards: text-forward for V1; images deferred pending cost-effective approach** (2026-05-28, resolves design/decision conflict)
- The Figma briefs assume hero food photography + thumbnails, but V1 ships text-forward (no images), consistent with the 1B "text-forward for V1" decision. Cards must look genuinely premium without photos (typography- and glass-led, à la Crouton/Mela) — no broken-image wells or empty placeholders.
- Rationale: AI image generation is expensive; generated meals have no natural image source; stock-photo matching is unreliable. But the mocks *do* look notably better with imagery, so this is a "ship without, but solve later" — a cost-effective image strategy is a real future need, captured in the backlog. Griffin explicitly wants the no-image version to look great so we *can* ship without them.

**Plan modification returns a targeted diff, not a full regeneration** (2026-05-28)
- "Make Tuesday lighter" returns structured slot-level operations (replace slot X with concept Y, swap, mark eating-out), applied transactionally — it does NOT regenerate the whole week. Every AI-returned `slotId` is validated to belong to the household's plan before applying (never trust AI-returned IDs).
- Rationale: full regen would wipe untouched slots' feedback/confirmed state and cost ~5× for a one-meal change. Diffs preserve the rest of the plan and are cheaper.

**Rate limiting middleware added in 1C** (2026-05-28)
- A minimal per-user rate-limit middleware is added to the tRPC layer now and applied to AI-calling procedures (plan generate/modify, and retrofitted to recipe generate/importUrl/modify). Closes the existing repo-wide gap against the `trpc-routers.md` rule.
- Rationale: plan generation is the most expensive AI call; a bug looping generation could quietly burn the OpenAI key. Cheap insurance even for a 2-user app. The rule already requires it and nothing implemented it.

**V1 Plan Model: Rolling 7-day plan from creation day** (2026-05-29)
- The V1 plan is a fixed 7 days starting today (UTC). `dayOffset 0` is the day you create the plan; `dayOffset 6` is six days later. The plan has NO calendar-week alignment — it does not anchor on Sunday or any week boundary. The `meal_plans.week_start` column stores the creation day.
- **One active plan per household.** Generating replaces it outright (delete-all + insert in one transaction). No plan history, no concurrent plans.
- The mid-week ("EARLIER THIS WEEK / rate what you cooked") layout appears only when the plan is `status='confirmed'` AND at least one slot's date is in the past. A draft plan always shows the review layout, no matter what day it is.
- Rationale: The original Figma briefs assumed Sunday-morning planning for the calendar week (Sun–Sat). But real users generate plans mid-week, and every calendar-week model degrades for that case: current-week-with-past-days shows "EARLIER THIS WEEK is full of meals I never cooked"; next-week semantics introduce a 0–6 day holding state before the plan is "live"; user-picks-duration adds configuration before we know users want it. Rolling-7-from-today is the only model that's coherent regardless of when the plan is created, matches the chef metaphor ("plan my dinners"), and stays simple. Validated by reproducing the alternative-model failure modes during Session 12 testing.
- Future impact: The streaming generation prompt is keyed on `dayOffset 0–6`. The mid-week view gating logic depends on this model. The "one active plan" rule means we cannot offer plan history or "draft a future week alongside this one" without revisiting the data model. Alternative mental models (calendar-week current-week, calendar-week next-week, user-selectable start day, user-selectable plan length, auto-inferred-from-intent) are captured in `idea-backlog.md` as real models other users may hold, to consider after the core loop is validated.

### Session 13–14: Security Hardening Decisions (2026-07-06)

**Proxy session check must match chunked Supabase cookies** (2026-07-06)
- The cookie-presence check in `src/lib/supabase/middleware.ts` uses a regex matching `sb-*-auth-token` AND its chunked variants (`.0`, `.1`), while deliberately excluding `sb-*-auth-token-code-verifier` (exists mid-OAuth, pre-authentication — matching it would create a redirect loop).
- Rationale: @supabase/ssr chunks large sessions (Google OAuth always). The old `endsWith` check treated every Google-authenticated user as logged out. This was the entire "login broken" incident.

**RLS lives in the migration chain; no FORCE; app-layer scoping is the primary control** (2026-07-06)
- RLS policies are versioned in `0002_rls.sql` and guarded by a static CI test. FORCE ROW LEVEL SECURITY is deliberately absent: the app's connection role has BYPASSRLS, so FORCE is a no-op. Threat model: RLS protects direct PostgREST/anon-key access; household scoping in tRPC (`ctx.householdId` on every query) protects the app path.
- Future impact: if the app ever moves to a non-owner DB role or plumbs JWTs into the Drizzle connection, revisit FORCE.

**AI cost control is two-layer: in-memory per-minute + Postgres daily budget** (2026-07-06)
- 10 calls/min (in-memory, per-instance, UX guard) + 150 calls/user/day (Postgres atomic upsert, distributed hard cap). Chosen over Upstash/Vercel KV to avoid new infrastructure; Postgres is already shared across instances.
- Future impact: before real signups, move the per-minute limiter to a shared store; the budget table pattern extends to token-based budgets if needed.

**One household per user is a DB constraint** (2026-07-06)
- `household_members.user_id` has a unique index; `ensureOnboarded` creates household+membership transactionally and recovers gracefully when a concurrent call wins. Encodes the V1 single-household model at the database level.
- Future impact: multi-household membership (if ever wanted) requires dropping this index and redesigning `protectedProcedure`'s household resolution.

**Meal-scoped modify uses natural-language injection, not a structured target** (2026-07-06, Session 15)
- When a modify is scoped to a specific meal (card chip or meal-scoped chat), the target day + dish are injected into the request string (`scopedRequest()` in `plan-helpers.ts`), e.g. "swap this for salmon — for sunday's Chicken Tikka." The `plan.modify` procedure stays a single free-text field; the AI resolves the target from the text + the current-meals list. Chosen for consistency (the card chips already worked this way) and minimal surface area over adding a structured `targetDate` to the procedure.
- Future impact: if scoping ever proves unreliable at scale, revisit by passing an explicit target to `plan.modify` and constraining the AI to that slot. Regression test lives in `plan-helpers.test.ts`.

**One active plan: generation replaces the current plan** (confirmed Session 15)
- The stream route's `persistPlan` deletes the household's existing plan and inserts the new one, transactionally. The one-active-plan data behavior is implemented server-side; the gap is purely UI (no regenerate trigger — see open-questions).
- Future impact: plan history / concurrent next-week drafting (deferred idea) would require keying on plan identity instead of "delete all for household."

---

### Plan-tab interaction decisions (Session 16, 2026-07-08)

**Regenerate lives at the end of the meal list, muted — never the header** (2026-07-08)
- "Start over →" (draft) / "Plan a new week →" (confirmed) sits below the last meal card, as a muted text link. Rationale: the header sits next to Settings and would be fat-finger territory for a destructive action; an overflow menu is over-engineered for one item. The primary "Looks good →" confirm lives in the hero + sticky bar (top/anchored) — different zone, different emphasis.

**Regenerate re-prompts through the intent screen, not a blind reroll** (2026-07-08)
- Tapping regenerate routes to the existing `NoPlanState` intent capture (pills + freeform). Rationale: fresh weekly intent is the entire value of the ritual; a blind reroll turns the chef into a slot machine.

**No confirm dialog for destructive regenerate — the intent screen is the airlock** (2026-07-08)
- Generation is non-destructive until the stream POST fires (`persistPlan` deletes+replaces only then). So routing to the intent screen destroys nothing; the destructive act requires a deliberate second tap on a pill/send. Safety = one muted (not red — red fights the chef tone) line above the pills when replacing a confirmed plan. No Undo is offered (hard delete).

**Elapsed plans invite a fresh week, not a mid-week adjust** (2026-07-08)
- A plan whose every day is past renders a "week wrapped" chef check-in (`isPlanElapsed`), not the mid-week "adjust the rest of the week" view. Closes the loop as a ritual moment.

**AI-mutation feedback is in-place and scroll-independent — never a top-of-page toast** (2026-07-08)
- App-wide pattern (`usePlanModify` hook, reusable across tabs). The tapped element reacts instantly; the initiating sheet stays open showing pending and closes on SUCCESS (not on tap); scoped changes acknowledge on the changed card; whole-week changes narrate in a bottom pill. Removed the old `chefMessage` top toast. Rationale: Griffin's testing — "if you're not paying attention you might not notice," and top toasts are invisible when scrolled down.

**Drawer click-outside via a self-contained scrim** (2026-07-08, corrected 2026-07-09)
- Click-outside-to-close via a custom scrim that never touches `document.body` pointer-events, so it can't reintroduce the two-drawer lockup that forced `modal={false}`.
- **CORRECTION (Session 17):** two claims in the original decision were wrong. (1) Click-outside was actually DEAD in the browser — the scrim ALSO inherited `pointer-events:none` from vaul's `modal={false}` portal, so tapping outside did nothing. This was a real bug that shipped to prod (Session 16) and was caught only in the Session 17 manual pass; fixed with `pointer-events-auto` on the scrim. (2) The claimed "background scroll is sacrificed" tradeoff never happened — with the fix, the background STILL scrolls while a sheet is open, and Griffin ACCEPTED that (he wants both a scrollable background AND click-outside). Net real behavior: both work. (Mobile caveat: a real-phone touch-drag on the scrim may be captured — confirm on-device.)

**Design polish is a dedicated system pass AFTER the V1 flow is complete, not per-screen now** (2026-07-09)
- Do NOT polish screens as they're built. Keep the UI clean-but-plain until the north-star loop (Plan → Groceries → list) works end to end and is validated, then do ONE design-polish pass with the ux-design-critic as a design-SYSTEM exercise (type scale, spacing, motion, component library, imagery).
- Rationale: (1) polish is a system built once against ALL surfaces — piecemeal now = build a partial system then rebuild it; (2) the flow will still shift once the loop is complete, wasting any polished-then-restructured screens; (3) sunk-cost anchoring — a screen that "looks done" resists restructuring the validated flow may demand; (4) value before premium — the design moat only matters once the flow delivers value.
- **Exception:** usability bugs and rough edges (dead click-outside, missing cursors, bad chip phrasing, awkward sticky bar) are QUALITY, not polish — fix inline as found. Feedback gets triaged: bug/quality → fix now; visual refinement → polish backlog for the system pass.

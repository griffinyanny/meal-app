# Meal Management App - Project Context

## What This Is
An AI-powered meal management app that unifies the full meal journey: recipe discovery -> meal planning -> grocery list -> shopping -> pantry -> health/diet adherence. Intended as a productized freemium app.

## Who Griffin Is
Senior product manager (not an engineer). 10 years in tech, 6 working closely with engineers. Understands technical concepts at product level. Does not write code. Relies on Claude as technical partner.

## How to Work on This Project
- **Check in before building.** Walk through the approach before writing code.
- **Explain at the right level.** Griffin knows APIs, databases, frontend vs backend, deployment. Bridge the gap on syntax, framework internals, and implementation details.
- **Advise on technical decisions.** Give recommendations with short reasons.
- **Keep it real.** Flag bad ideas, complexity, or simpler alternatives directly.

## North Star
"I have no idea what to cook" -> "My grocery list is ready" in under 10 minutes.

## Current Phase
**Phase 1F (Polish / Production Readiness) is 🔨 OPEN.** Scope: `docs/scope-1F.md` — four workstreams,
**A ship-blockers → B design-system pass → C PWA → D production readiness**. Read `docs/whats-next.md` first.

**Workstream A is ✅ CLOSED at 6 of 6 (S50 + S51), all merged to `main`** — A1 (BUG-035), A2 (BUG-020/021),
A3 (BUG-011/012/010) as PRs #9/#10/#11; A4 (BUG-013), A5 (BUG-042/043), A6 (BUG-018) as PRs #12/#13.
**Workstream B is 🔨 OPEN: B1 + B5 (S52) and B9 (S53) closed — 3 of 9, 6 items remain.** **691 unit +
123 E2E green, migration `0010` applied.** Next: B2 → B3 → B4 → B6 → B7 → B8. **No taste calls are pending
on any of them.**

**⚠️ THE LESSON, now five sessions deep, and it has changed shape every time. S50: the tracker was WRONG
about what three of the six bugs WERE. S51: right about the bug, WRONG ABOUT THE FIX, twice. S52: the bug
had ALREADY FIXED ITSELF, and the doc had the reason backwards. S53: the parked instruction was not merely
wrong, it was DESTRUCTIVE — and the filed bugs were the smaller half of what was actually broken.** Reading
the code is not enough, following the recommendation is not enough, and neither is trusting that the defect
still exists — a parked item's description is a hypothesis from the day it was filed, not a spec.

- **S53 · the gate could not see either surface it was grading.** `seed.ts` hard-coded
  `ingredients: []` / `steps: []` for EVERY recipe the Recipes seeder produced, so BUG-038 was **100% of
  seeded recipes** and `recipes-detail-add-to-week` — the tab's only detail capture — **had never once
  shown a populated recipe body.** Fixing the filed bug alone would have made the gate *blinder*, turning
  that capture into the empty-state fallback and grading it as canonical. Both later seeders already wrote
  real ingredients; this one was the outlier and nothing failed because of it. **Third instance of
  *ask what the layer cannot see*** (S47 sheet states, S52 `grocery-complete-banner`), and the sharpest:
  here the state existed but was silently the **wrong** one.
- **S53 · a capture workaround is a blindfold.** `recipes-facts.ts` waited on
  `[data-testid="add-to-week"]:not([disabled])` before shooting, stepping around BUG-037 and making the
  visual layer structurally unable to see it. **When a capture waits out a condition, ask whether the
  condition is the bug.**
- **S53 · `you-field-editor`'s CAPTURE_ISSUE was a stale selector, carried two sessions as product work.**
  It asserted "How many you're cooking for", absent from `src/` since A3 (S50) retitled the sheet to
  "Who I'm cooking for". BUG-030's class: a stale capture selector fails **silently** where a spec fails
  loudly. **Whenever copy changes, grep the capture `readyText` and `facts` for it.**
- **S53 · two overlapping E2E runs reddened six Plan specs on pure data contention** (both seeding the same
  test household). That is S37's failure mode, live. **Never run two suites at once, and never run the
  suite while using the app.** A red with no pass/fail summary line is usually infrastructure, not tests —
  a leftover `next start` holding port 3102 produced `EXIT=1` earlier in the same session.

- **S52 · the "indigo draft pill" had not been indigo since 1E.7.** Spec §12 item 03 and scope-1F both
  called it *"the last live indigo after 1E.7 retired `--primary`"* — but retiring `--primary` is exactly
  what **killed** it. Zero indigo literals remain in `src/`. **The real defect was underneath and was not
  what was filed:** with indigo gone the pill had become **cream**, the *action* hue, so a status label was
  wearing the one colour that means "tap me". **Verify the defect still exists, and in the form described,
  before you fix the thing that was written down.**
- **S52 · a force-failure that nearly recorded a false red.** Stashing the fix and re-running gave exit 1 —
  the right shape of proof — from `--reporter=basic`, a flag vitest 4 does not have. The suite never ran. A
  second attempt raced `git stash pop` and went green against restored code. **"It went red" is not the
  check. "It went red for the reason I predicted" is** — read the failure text, never the exit code alone.
  Use a physical file backup, never chained `stash && test && pop`.
- **S52 · a stale exception is worse than no exception.** `visual-qa-rubric.md` told the judge to ignore the
  exact two things B1/B5 had just fixed. Whenever an item closes, grep the rubric, `PROJECT-CONTEXT.md` and
  the capture `facts` for its do-not-flag entry — a licence to ignore outlives the reason for it.

- **BUG-013's recommended fix would have doubled the injection.** "Recompute from `(questionId, values)`"
  lands in `memoryForAnswer`, whose label lookup fell back to the **raw value** (`?? v`) — harmless on the
  client, which produced the values it is looking up; on the server `values` is caller-controlled at
  12 × 60 chars. The naive version was built first and the test went red against it. **A recompute is only
  as trustworthy as the inputs it recomputes from, or it is laundering.**
- **BUG-018's named `assertNotProductionUrl()` would have failed OPEN.** No property of a URL says
  "production," so the guard has to enumerate prod and pass everything else — exactly backwards for a
  destructive-write guard. Shipped as an **allow-list** with a committed project ref (a guard stored in
  `.env.local` cannot catch a bad `.env.local`).
- **BUG-042 was measured rather than assumed.** `GET /auth/v1/settings`: `external.email: true` but
  `mailer_autoconfirm: false`, so the bypass needs both halves and has one. Not exploitable. ⚠️ The same
  probe shows `disable_signup: false` + `google: true` with both gates unset — **prod is open to anyone who
  finds the URL**, by Griffin's deliberate S49 call, and the email toggle does not change that.
- **A fourth "the apparatus could not fail" instance, inside the workstream whose bar exists to catch it.**
  BUG-013's values assertion matched case-sensitively against a branch that lowercases its output, so it
  walked past a string that had in fact been planted.

### The lesson of S50 (retained — it is the one that opened this run)

- **BUG-035 had no 90-second timeout at all.** The only `90_000` in the repo is the Playwright `waitFor`
  ceiling in `plan-live.capture.ts`; S45 recorded the *test harness's own wall* as the server's. The real
  abort was ours at 60s.
- **Its failure card had been unreachable on EVERY path since it was written.** `useObject` only sets
  `error` for a failed *request*, and the route has already returned 200 with an open body by the time a
  stall happens — so a dead stream arrives as a body that simply **closes**, and nothing renders. First run
  erased the user's typed request; regenerate silently reappeared the old plan. **🔴, not the 🟡 filed.**
- **`maxDuration` (60) EQUALLED the AI abort (60)**, so on Vercel the platform's kill and our timeout landed
  at the same instant. Now a ladder — 45s attempt → 100s outer → 120s `maxDuration` — pinned by
  `config.test.ts`, which **scrapes `maxDuration` out of the route source** rather than retyping it.
- **A3's fix was chosen against this doc's own recommendation.** "Read-only `householdSize`" would have
  broken both bare-count writers. Griffin took the real fix: a shared `HouseholdComposer`, a band-aware
  `set_household` op, and the scalar read-only. A bare head count **lands on adults** — a stated guess, not
  drift.

**Two S50 habits worth keeping.** Every fix shipped with a test **verified failing against the pre-fix
code** (stash the source, re-run, confirm red). And where a race was the bug, the spec holds the window open
with a **gate the test releases** rather than a timer — a spec that only reproduces on a slow machine is
worse than none.

**✅ `DEV_TOOLS_EMAILS` is CLOSED (Griffin verified test mode on prod, S50).** Carried for nine sessions;
do not raise it again.

**✅ `maxDuration` CLOSED (S52) — it was NOT clamped.** Checked via the Vercel API rather than handed back:
the production build of `00062a4` (the tree carrying `maxDuration = 120`) completed with no clamp warning
and deployed READY, and Vercel fails the build outright when the value exceeds the plan ceiling — so 120 was
accepted and **fluid compute is on**. Residual: that proves the *declared* ceiling was accepted at build
time; only a real generation running past 60s proves the runtime honours it. Do not raise it again.

**⛔ BUG-042 — DO NOT disable the Supabase Email provider. The standing instruction was wrong AND
destructive, retracted S52/S53.** Its premise ("the app has never used that path") is false: the E2E
harness's only sign-in is `signInWithPassword` (`tests/e2e/harness/supabase-session.ts:160`, `:174`), which
rides the email provider, and line 182's own error string already said *"Check that the Email provider is
enabled."* Turning it off reds all 121 specs. **Fifth instance of the phase's lesson and the sharpest one:
the parked recommendation was not merely wrong, it was destructive** — and Claude repeated it twice in S52
without checking. It now bundles with the separate non-prod Supabase project decision (that project is what
would let prod disable Email while the harness keeps it on).

**Owed by Griffin:** the separate non-prod Supabase project call — one word, accept (V1.5) or set it up now.

### Prior sessions (retained for context)

**S49 closed 1E.5 at M5.5 and opened 1F.** The taste gate closed on **three S49 fixes, not on a clean
look** — worth knowing because it is the precedent. S48 ran Griffin's taste pass as a **decision ballot**
(he could not see the captures, so he delegated to the recommendation slate); S49 then put eyes on the
after-captures before merge and found three things visible only in a screenshot. **The rule: when a taste
pass is delegated to a recommendation slate, the visual half still runs as its own pass before merge.**
Also settled: **NO closed beta** — two-user validation ships R1, both gates stay unset (env, not code), and
a beta is deferred to V1.5.

**S47 answered BUG-034, cleared both visual-QA layers, and found a bug that had been shipping since 1E.7.**

- **BUG-034 was an unwired field, and Griffin chose to wire it.** Frame `3i` draws TWO strings at two sizes; `chef-header.tsx` had props for both and `week-wrapped-state.tsx` passed both, but **`plan-review.tsx` passed only `summary`**. New `chefNote` (migration `0009`) carries the argument into the gold slot. **The one-sentence ceiling lives in CODE, not the prompt** (BUG-033's lesson), and it **splits rather than truncates** — overflow becomes the argument. `absorbRepeatedMethod` had to start matching BOTH halves, or the split would have silently disabled absorption. Live: claims 76–89 chars, first meal ~210px down. ⚠️ Residual: one *sentence* is guaranteed, one *line* is not.
- **🔴 Every `.glass-card` / `.glass-surface` / `.glass-sheet` in the app had NO backdrop blur in Chrome and Android since 1E.7.** Those three hand-wrote `-webkit-backdrop-filter` beside the standard property; **lightningcss collapses the duplicate onto the prefixed form and drops the standard one**, and Chrome removed the prefix years ago. The `.94` fill stayed correct, so it read as deliberate flatness. **NEVER hand-write a vendor prefix in `globals.css`** — `src/app/globals.test.ts` enforces it. This is also **BUG-022's real cause**, which S42 had misattributed to the spec's intended translucency and parked for 1F on that basis.
- **Layer A had never captured a single sheet state.** W7's meal sheet shipped in S44 and Slice 1 cleared 0/0 without one frame of the surface that sits on top of everything else. Fixed; `meal-sheet` is a capture state, and the runtime gained `useHud`/`viewportOnly` for drawer states.
- **Layer B fired the absorption path live for the first time** (owed since S45 — it needed a server log, because absorption erases its own evidence), verified the named night is honoured, and found **BUG-040 🔴: the chef writing `Day 0` straight to the user.** BUG-031's exact defect through a second door — S45 gave *generation* a day map and nobody asked whether *modify* had the same hole. Fixed and verified live (it says "Sunday" and lands on a Sunday).
- **Two races diagnosed rather than retried.** D4's drag failed only in full runs (BUG-019's signature): the sheet was still animating open, translateY running 416→196→57→21 during a drag meant to move it down. And an *apparent* bug — the tab bar seemingly above the picker — was killed by measurement: it was the capture growing the viewport, which vaul does not reflow to. **Judging that screenshot by eye would have produced a fix for a bug that did not exist.**

**⚠️ Griffin's two open calls:** **BUG-041** (§B's boundary sentence has now failed to appear in two live rounds; recommendation is BUG-033's precedent — stop asking, render it as product copy), and **which of the critic's 16 staged findings to apply**. Also still open: `DEV_TOOLS_EMAILS` in Vercel Production (eighth session), BUG-035, BUG-037, BUG-038, scope-v1's closed-beta question. — History below is retained for context.

**S46 closed BUG-019 by fixing it, and built Slice 2's two entry points.**

- **BUG-019 (GR7's three-session flake) is a race, not timing noise.** The helper crossed `@dnd-kit`'s 8px activation distance then fired ~24 `mousemove`s **without waiting**. dnd-kit collides against a droppable-rect snapshot taken at drag START, so before React committed that render every move resolved against nothing, `onDragEnd` got `over: null`, and the handler returned early — **no mutation, no error, no request.** A silent no-op indistinguishable from a broken feature, losing the race only under load, which is exactly why it failed in full runs and passed in isolation every time. `GrocerySection` now exposes `data-dragging` (there is no `DragOverlay`, so the lift was only ever an opacity class); the helper waits on it and yields a frame between moves; the assertion reads the **whole persisted aisle order** against the order before the drag. **Green in the full sequential suite**, which is where it actually reproduced.
- **W8 (the picker) is a third subject on the existing `PlanSheet`** — one drawer, content swapped in place, asserted by `L12` rather than assumed. Content rules live in a pure `picker-helpers.ts`. Provenance travels as a **`[N]` reference, never a DB id** (the `grocery.talk` pattern): the model sees `[1] Spaghetti alla Carbonara`, returns `pickedRef: 1`, the server maps it against the list it sent. `plan.modify` and the new `plan.pick` share an extracted `applyPlanChange`.
- **Both remaining build dependencies landed.** Dep 2: the chef returns the scaled count and the meta says `scaled to N` — **only where a scaling actually happened**, which `L10` pins by asserting a chef-proposed night in the same week still reads `serves`. Dep 4: a picked slot is written `recipeStatus: "ready"` on the person's own recipe, which both gives `normalizeSlot` something to warm off the confirm path AND stops hydration generating over a recipe the person chose.
- **W10, both halves of `3l`.** Detail gets `Add to this week` (never asks for a day; with no week it **carries** the recipe to the intent screen rather than failing). Library loses the floating toolbar — `recipe-toolbar.tsx` deleted, search into a new header. `RC11` measures `position: fixed` rather than trusting a class name.

**Two things I got wrong mid-build and corrected, both worth remembering.** (1) I implemented "the chef answers with a night" unconditionally, which made frame `3e`'s primary — *"Put it on Thursday"* — a lie. The rule and the frame describe different invocations: `3b` captions "The chef picks the nights", `3e` names one. A named night is honoured now. (2) **The generation fixture was prompt-blind**, so "picks survive a regenerate" could not fail — a build that dropped every pick would have passed. Third instance in three sessions of the same class (BUG-030, S40's silent prompt test): **the apparatus has to be able to fail.**

**Layer A is no longer blind to BUG-034**: every seed said "Your seeded test week, ready to review", one short line, which is why nine lines of 22px type never appeared in a mock capture. The seeds carry a realistic summary now. That is not a fix — BUG-034 is Griffin's call — it is what lets the layer see the class.

**Deliberately NOT built, stated rather than discovered:** §B's who-clause (`Griffin's pick`) needs a display name R1 has no surface for → V1.5 with household sharing; §B's "too many picks" conversation (`3m`) is a separate screen needing a judgement the chef isn't asked for → V1.5; `LIBRARY_EMPTY` did not become a seed state because `EMPTY` already is one.

**Still open:** BUG-034 (Griffin's call), BUG-035 (a real generation timed out at 90s), `DEV_TOOLS_EMAILS` in Vercel Production (seventh session), scope-v1's closed-beta question. — History below is retained for context.

**Work is on branch `session-43-1e5-plan-rebuild`, in a git worktree at `../meal-app-1e5`** (a concurrent process took the main checkout mid-session and created `session-43-access-gate`; nothing was lost). **591 unit + 108 E2E green, lint + typecheck clean, migrations `0007` + `0008` applied, `/visual-qa` Layer A at 0/0 on Slice 1, Layer B run three times. GR7 green in the FULL sequential run.**

**LAYER B IS THE STORY OF S45. Four defects, none visible to the mock, and one was caused by the previous Layer B's own fix.**

- **BUG-031 🔴 — the chef named a day that hadn't happened and didn't have the ingredient.** *"Uses the leftover fresh dill from Monday"* printed on a **Thursday**, on a Wed→Tue week whose Monday was four days later and carried fried rice. **S40's fix caused it:** S40 caught "reusing olive oil from day 0" and told the prompt to use weekday names — but nothing ever told the model *which* weekdays, so it mapped `dayOffset` onto a Monday start. That made the fix a **downgrade, not a repair**: "day 0" looks like a bug and gets reported; "Tuesday" looks correct and quietly misinforms. Fixed structurally — `buildPlanStreamParams` now takes `weekStart` and sends a real day map in the **user** message. Verified live.
- **BUG-033 — W1's title rule was marked ✅ in the scope table and was never in the prompt at all.** Found by grepping for it while judging the very run that existed to verify it. **The four-or-more half now lives in code** (`absorb-method.ts`), because round 2 asked for "I want to grill" *with the prompt rule in place* and returned **seven of seven "Grilled X"** — S40's finding verbatim. A style clause cannot outrank the request it competes with, and "does one word open four or more titles" is a string test. ⚠️ **The code path has not fired live yet** — round 3 produced no method-opening titles.
- **BUG-032 — the reuse rule had colonised the chef's voice**, 7 of 7 rationales arguing waste. Capped at two; 2 of 7 live. This was also the cause behind Layer A's "seven gold rationales read as texture, not voice."
- **BUG-030 — the Layer B capture spec was the one Plan file S44's migration missed**, so round 1 paid for three real generations and threw them away against the deleted hero. **A stale selector fails loudly and free everywhere else in the suite; here it fails silently and bills you.**

**W6 judged rather than counted:** 63/63 slots priced, zero nulls. Ranking stable and right (salmon dearest in every week, **$12.00 in three independent runs**); level soft — **$44–$74** for seven dinners for two across runs of the *same* prompt, low end ~30% under a real shop.

**Griffin's two calls (S45), both as recommended.** (1) **The cost number comes off week-wrapped entirely** — it lives on review and the confirmed grocery row. **W6 closes**; the wrapped half is descoped, not owed. (2) **`Start over →` stays a foot link under the rail, gap tightened.**

**Slice 2 landed its spine, not its entry points.** **Provenance is a nullable `picked_recipe_id` column, NOT a `slotType` enum value** (Griffin ratified the deviation from build dependency 3): the cookability test `slotType === "recipe" || slotType === "leftover"` is duplicated in **eight** places, two in the grocery collector, so a new enum value could silently drop a deliberately-chosen meal from the shop — and the column carries *which* recipe, which regenerate-survival and pick-time cache-warming both need anyway. `DINNER · PICKED` derives from data; new `PICKED` seed state + `L1`–`L4`. **W8 (picker) and W10 (Recipes bottom edge) are not built.**

**Also open:** BUG-034 (the chef summary runs 6-7 lines and pushes the first meal below the fold — decide before Griffin's taste pass), BUG-035 (1 real generation in 9 timed out at 90s), `DEV_TOOLS_EMAILS` in Vercel Production (sixth session), scope-v1's closed-beta question. — History below is retained for context.

**Work is on branch `session-43-1e5-plan-rebuild`, still not merged to `main`** — Layer B and Griffin's taste pass are the remaining gates. **538 unit + 91 E2E (90 green), lint + typecheck clean, migration `0007` applied, `/visual-qa` Layer A at 0 blockers / 0 high.** The one red is GR7, the known `@dnd-kit` drag flake (BUG-019, recurrence #2) — green in isolation.

**BUG-024 is CLOSED, and the migration is the story of the session.** The tracked cause list had three entries; **five** were real, and migrating the specs then surfaced **five more defects in the rebuild itself** — none of which were visible from the code. The Plan specs are now migrated, not weakened: M1 asserts the working ring via **computed `box-shadow`** (§C's rule is that the ring is *gold*, and a class-name match would pass on a grey one), M5 measures the toast against the confirm bar's real bounding box, M6 proves every chef action goes inert rather than that one tap was silently dropped.

**The two untracked BUG-024 causes:** the standalone `Talk to the Chef` button is gone (the whole-week door is the chef header's `Something's off`), and **`Start over →` vanished from the draft screen entirely** — the header carries ONE revise control and frame `3i` spends it on the modify door, so the regenerate airlock became unreachable from a draft. A dropped feature, not a stale selector. Restored as the foot link under the rail; **placement is Griffin's call.**

**The five defects the migration surfaced:** **BUG-025** (the floating slot was `absolute`, so `Confirm 7 dinners` scrolled off the end of a seven-day draft — the frame's "bottom 96" is a distance from the *screen* edge, and in the app the scroll container is the document), **BUG-026** (the dropped Start-over door), **BUG-027** (§D's 168/108px scroll padding was never built), **BUG-028** (deleting the hero left the Plan tab with **no heading at all**; `ChefHeader`'s summary is now an `<h2>`), **BUG-029** (a failed modify became unreachable once you dismissed the sheet — fixme'd rather than weakened, then fixed by W3).

**Slice 1 shipped:** the rail (W1, **BUG-008 closed**), the chosen-days week (W2), the toast owning the action bar's slot (W3 — one derived value, error → working → ack, and the slot renders the toast **or** the primary, never both), the four time states (W4), generation as the provisional row (W5, **BUG-009 closed**), cost estimation's review half (W6 — an implausible estimate is **dropped to null, never clamped**, because clamping invents a number), and the summary meal + day sheets (W7, **BUG-006 closed**). **The day sheet and the meal sheet are ONE drawer** — "the same shell" taken literally, which also takes a drawer out of the tree rather than adding one (decisions.md, S44). New `P` (rail) and `C` (cost) spec families; five new seed states; **ADVERSARIAL re-pointed**, since two of its three findings are expected renderings now.

**Owed to Griffin:** the `$94 spent` copy call (recommendation: `~$94 est.`, or drop the number from week-wrapped entirely and keep it only on review — wrapped is a recap, and it is the frame where the user most likely has the receipt), and where `Start over →` belongs on a draft. Also still carried: `DEV_TOOLS_EMAILS` in Vercel Production (fifth session), and scope-v1's closed-beta question. **Next: Layer B, then Slice 2.** — History below is retained for context.

### Prior phase — 1E.7 (design-system sweep), ✅ CLOSED S42, 2026-07-27, M5.7 met

**The whole app now runs on Design Specification v1.0** — every cool-white alpha warmed to `rgba(240,222,190,x)`, each surface carrying exactly one of the three named wash recipes, every radius on the eight-rung scale, and **the pre-spec `:root` family retired to an alias layer over the `--spec-*` tokens** rather than deleted (those names are the bridge Tailwind's `@theme inline` and every `ui/` primitive read). The consequential alias is **`--primary`, indigo `#3A86FF` → cream** — every `bg-primary` in the app is a button and §01 admits no third accent, so this repainted every primary button in the product. `.glass-surface`/`.glass-card`/`.glass-sheet` survive as names but are now aliases onto the elevation ladder; the **tab bar** could not come with them (chrome sits darker than the floor, glass sits lighter) and says `.spec-chrome` at its one call site. **Do not add a new colour value anywhere but the `--spec-*` block.**

**The gold line (Griffin ratified, S42): _gold marks the chef speaking, not content you read._** This is the arbiter whenever the spec's laws collide — law 03 grants the chef's italic rationale accent colour while law 06 caps gold at three marks, and a budget count cannot settle that. It closed the S40 gold-budget question and all four onboarding conflicts (`SO HERE'S YOUR WEEK` → `text.primary`; the intro's gold icon tiles → bare muted icons; the baby-stage chips → cream; the caught-tray chip → neutral inset), and settled the S41 landed-ring question the same way — the shimmer bar and highlight ring went **indigo → gold**, because both mark the chef *working*. **Owed to Griffin:** his instruction said "orb/byline/hook stay gold," but the byline is currently cream and the hook is `text.feature`; "stay" was read as *leave alone* and neither was escalated. His call.

**Three things are still deliberately un-migrated, routed to 1F** (spec §12 items 03/04/05/07, each wants its own `/visual-qa` pass): the iOS-green `#30D158` cooked/complete checks, the amber `#FF9F0A` Groceries merge markers (the spec has no caution hue *because* amber is the chef — a semantic call, not a token swap), the Recipes double bottom bar, and icon-only controls under 44px.

**S42 also repaired the QA apparatus, which was about to grade against the retired palette.** `docs/design/visual-qa-rubric.md` §(b) was still checking for a "warm near-black bg (`#0E0E10`–`#141418`)" — it would have **passed the old palette and failed the new one**. It now grades the spec's six laws, carries the gold line as the documented tie-breaker, and lists the 1F items as do-not-flag. `.claude/commands/visual-qa.md` and `docs/design/PROJECT-CONTEXT.md` were re-pointed at the spec too; PROJECT-CONTEXT had still been telling Claude Design that Plan/Recipes/Groceries/You were "the before."

**480 unit + 78 E2E green, lint + typecheck clean.** Open bugs: BUG-020/021, BUG-010/011/012/013, BUG-017, BUG-018, BUG-019, BUG-003, BUG-006/008/009 (→1E.5). — History below is retained for context.

### Prior phase — 1E (You tab + memory), ✅ CLOSED S40, 2026-07-26, M5 met
S39 had invalidated the S38 gate clearances (it rebuilt the reflect screen, deepened the interview, changed the chef prompt and migrated onboarding to a new design system), so S40 re-ran all three from scratch and cleared them.

**What S40 found (the gates were not a formality).** `/visual-qa`: 0 blockers / 0 high across 22 Layer-A states, judged against **Design Spec v1.0's six laws** rather than the superseded `Guidelines.md`; two high fixes (the mic toast let the confirm + skip labels ghost through it at the spec's `.94` L5 fill; the You capture shot the page before `devToolsEnabled` resolved, hiding the test-mode card on one state and dropping it under the fixed tab bar on another). **Layer B answered the question it was owed for — the ingredient-reuse rule works and does NOT cost variety** (six real weeks, 7/7 distinct proteins and dish forms in every one, one bunch of dill finished across three different dishes) — **but caught three defects the mock is blind to by construction**: the internal `dayOffset` vocabulary printing "reusing olive oil from day 0" onto a user-facing card, the chef inventing "use spinach fresh from last shopping trip" on a first-ever plan (there is no pantry model; pantry is V1.5), and reuse over-generalised to pantry staples. One clause in `PLAN_OUTPUT_RULES` fixed all three, locked by three new assertions (the existing prompt test is `toContain`-based, not an inline snapshot, so the first edit passed silently), and round 2 verified them gone live. `/code-review`: pass 1 of the palette migration had warmed the *fills* but left `border-white/10` — the exact cool white **law 04** forbids — on every unselected chip and card in the interview; fixed. **BUG-020** and **BUG-021** logged rather than fixed at the gate.

**Owed to Griffin:** a decision on four **spec-vs-locked-design** conflicts the critique raised and deliberately did not fix — chiefly the reflect screen's `SO HERE'S YOUR WEEK` rendering three to six lines of gold body text against law 03 and law 06's three-gold budget. The build is faithful to a Claude Design pass he ran; it is the spec that disagrees, so it is his call. Also still open: `DEV_TOOLS_EMAILS` in Vercel Production, and scope-v1's closed-beta question (parked *for* 1E, which has now closed without it).

**What S39 changed.** Three bugs closed (**BUG-016** silent failed save, **BUG-014** typed text lost on error, **BUG-015** tap/type race). The deep round went **4 → 5 questions**: new **`skill`** question (the only one of time/effort/skill that decides whether a recipe is *executable* rather than appealing), **`goal`** raised into reach because it already carried "Keep costs down" (cost is one option among several, never its own question), **`effort`** kept per Griffin but suppressed at a ≤30-minute ceiling; policy retuned (`minValue` 0.35, cap 6, `meterTarget` 5 with an eval invariant), **7/7 personas**. **Ingredient reuse became a planner default** in `chef-system.ts` (a perishable sold by the bunch gets a second, different dish that finishes it, guarded so it can never cost variety) — **unverified on the real model, Layer B owed**. **Test mode shipped**: `user.resetOnboarding` + a You-tab card, server-gated by `DEV_TOOLS_EMAILS` (Griffin must set it in Vercel Production). **The reflect playback was rebuilt** from a Claude Design pass into three blocks (opinion / `WHAT I'VE GOT` grouped by kitchen logic / `SO HERE'S YOUR WEEK` as consequences), derived by a new pure `src/lib/onboarding/playback.ts`; `ALREADY CIRCLING` is deliberately OFF because it names dishes nothing carries into generation.

**Design Specification v1.0** ("Gold voice, cream hand", theme 11i — `docs/design/system/design-spec.dc.html`) is now canonical and beats any earlier screen. Its migration runs in **three passes**: pass 1 = **onboarding, done S39**; pass 2 = **new phase 1E.7**, the mechanical app-wide items, ordered **BEFORE 1E.5** (1E.5 rebuilds Plan, so sweeping first is the difference between building it once and twice); pass 3 = **1F**, the surface-specific items. `--spec-*` tokens + the elevation utilities live in `globals.css` and are consumed **only by onboarding** today — do not mix them with the pre-spec `:root` family inside one surface.

**479 unit + 78 E2E green, planner eval 7/7.** Work is on `session-33-you-tab-audit`, pending the three gates before merge to prod. Open bugs: BUG-010/011/012/013 (composition + provenance), BUG-017, BUG-018, BUG-019, BUG-003, BUG-006/008/009 (→1E.5). See `docs/whats-next.md` + `docs/scope-1E.md`. — History below is retained for context.

Phase 1D: Groceries (M4 — a confirmed plan produces a usable grocery list). Slice 0 (docs) + A (hydration spine) + B (list generation + hybrid merge) + **Slice C (the shoppable list UI) COMPLETE as of Session 25**: the imported Groceries design is now interactive — grouped↔ungrouped organize toggle with `@dnd-kit` **touch-first** drag-reorder (sections + items, persisted via `aisleOrder`/`position`), inline merge-review (amber dot when `sources.length > 1` → per-meal breakdown + `splitItem`), one-zone GOT IT check-off + progress + completion banner, quick-add (optimistic + `tidyItem` AI categorize + client dedupe pill), clipboard export. 7 new household-scoped grocery mutations (`editItem`/`splitItem`/`clearChecked`/`tidyItem`/`setOrganizeMode`/`reorderSections`/`reorderItems`) + an optimistic `use-grocery-mutations` hook modeled on Plan; GR1–GR7 E2E + grocery seed states. 248 unit + 37 E2E green. **Architecture note (Griffin, S25):** the whole app stays on ONE architecture — Slice C added zero new patterns beyond `@dnd-kit` (the app's go-forward drag solution, chosen touch-first to build toward the native phone gesture). The Groceries screen is the highest-fidelity surface so far; a **1F visual-refresh of Plan** to match is logged in idea-backlog. **Slice D partial (S26):** the two Groceries-tab pieces shipped — the **staples chip row** (`staples` router + `StaplesRow`, tap-to-add reusing `grocery.addItem`, offered-not-auto) and **Talk-to-the-Chef** (the `grocery-talk` NL→ops AI task + `grocery.talk` router with **`[N]`-ref ID-safety** — the model never sees/emits a db id — reusing the relocated shared `TalkToChefSheet`). 287 unit + 41 E2E green. **Slice D COMPLETE (S27):** the **Recipes-tab reorg (#14)** is built from the chosen Claude Design (direction "d" — cooked STRIP + segmented `All/Favorites/Cooked` library + folded `FROM YOUR PLANS` shelf + floating search/＋ toolbar) in real components, plus the **cooked-signal harvest** (`src/server/recipes/harvest-cooked.ts` — lazy/idempotent/non-fatal stamp of `lastCookedAt` from a past confirmed slot; cook + favorite both detach `sourcePlanId` so history/promotions survive plan replacement; draft = `sourcePlanId != null`). First-ever Recipes E2E coverage (RC1–RC10). **294 unit + 51 E2E green.** Design archived at `docs/design/surfaces/recipes/imported.dc.html`. **Only Slice 5 wrap remains** (real-model merge-quality eval + `/code-review` + `/visual-qa` + deploy) to close 1D. Authoritative plan: `~/.claude/plans/rippling-herding-glacier.md`; scope: `docs/scope-1D.md`. (Phase 1C closed S19; 1B completed 2026-05-27, M2: full recipe AI loop on Vercel AI SDK v6 + OpenAI gpt-4.1-mini.)

---

## Session Protocol

### Document roles (read this first)

Two layers of documentation, each with a distinct job:

- **`docs/`** = **living operational state.** Granular, updated session-by-session. Source of truth for "where we are right now," "what decisions exist," "what's open." Files: `whats-next.md`, `changelog.md`, `decisions.md`, `open-questions.md`, `discovery-log.md`, `idea-backlog.md`.
- **`~/.claude/plans/purrfect-hatching-ladybug.md`** = **strategic roadmap.** Phased vision (V1 → V4), architectural decisions, technical strategy, operating model. Refreshed at phase boundaries (Phase 0 → 1, V1 ship, etc.) — NOT every session. If a session resolves a major architectural question, refresh; otherwise leave it alone.

The plan answers "where are we going." The docs answer "where are we right now." Keep them in their lanes.

### Resuming the project ("Resume meal app")
When Griffin says "resume meal app" or starts a new session in this project:
1. Read these files to restore full context:
   - `docs/whats-next.md` — **Exact status and pickup point.** Read this first.
   - `docs/scope-v1.md` — **the Release 1 scope hub** (phase spine, DoD, out-of-scope, post-MVP gate). Read before the phase doc.
   - `docs/scope-<phase>.md` (e.g. `scope-1C.md`) — the active phase's detail: features + acceptance criteria.
   - `docs/changelog.md` — what happened in previous sessions
   - `docs/decisions.md` — all confirmed decisions with rationale
   - `docs/open-questions.md` — unresolved questions
   - `docs/discovery-log.md` — Griffin's preferences, taste profile, and interaction model decisions (critical during Phase 0)
   - `~/.claude/plans/purrfect-hatching-ladybug.md` — the strategic roadmap, for context on where the current work fits in the V1-V4 arc
2. Briefly summarize to Griffin: "Here's where we left off: [status]. We were working on [topic]. Next up: [what's next]."
3. **Scope check (every session, ≤6 lines — momentum over ceremony):** open with a clickable link to [docs/scope-v1.md](docs/scope-v1.md), then: (1) release position — phase X of 6, what's left in the active phase; (2) roadmap position — one line placing R1 on the V1→V4 arc + post-MVP gate status; (3) deltas since last session; (4) items awaiting Griffin's call. Respond to any checkbox/comment edits Griffin made in the scope docs (he may edit directly, but usually he'll just say it — apply his words to the doc). During the session, anything new gets triaged — into scope (change-log line) or to the backlog with a phase tag. Don't build what isn't in a scope doc.
4. If there's an active phase plan in `docs/plans/`, read that too
5. Do NOT ask Griffin to re-explain context. The docs have everything.

### At the END of every session:
1. Update `docs/changelog.md` with decisions made, progress, and discussions
2. Update `docs/whats-next.md` with immediate next steps
2b. Update the active `docs/scope-<phase>.md` (feature statuses, scope-change log lines, open questions). Flip `docs/scope-v1.md` statuses ONLY if warranted — the hub changes on status flips/scope changes/DoD progress, not every session (anti-sprawl rule; phase docs carry the churn)
3. Update `docs/decisions.md` if any new decisions were made
4. Update `docs/idea-backlog.md` if any new ideas surfaced (slot into a phase or leave as Incoming)
5. Update `docs/open-questions.md` if any questions were raised or resolved
5b. Update `docs/bug-tracker.md`: add an Open row for any defect/risk parked this session (id + repro + severity + "address by" + status), and move any fixed items to the Resolved log with the date. This is a HARD step — a bug never gets "deferred to the backlog," it gets a tracked, reproducible entry that we close out. See the tracker's protocol section.
6. Update `docs/plans/README.md` if any plans were created, completed, or changed
7. Update "Current Phase" in this file if phase status changed
8. During Phase 0: update `docs/discovery-log.md` with any preferences, opinions, or insights Griffin shared
9. **Only if the session resolved a major architectural/strategic question** (e.g., locked a phase decision, changed V1 scope, picked a different platform): refresh the master plan at `~/.claude/plans/purrfect-hatching-ladybug.md`. Skip otherwise — the plan is not session state.
10. **ALWAYS paste the next-session kickoff prompt INLINE in the final wrap message** (fenced code block, unprompted). Writing it into `whats-next.md` is required but NOT sufficient — it must also appear verbatim in the chat so Griffin can copy it in one action. He must never have to ask. Offer a design-independent alternative prompt if the planned next step needs a design pass. (Hard rule — see the [[feedback_next_session_prompt]] memory.)

### Phase boundary checkpoints
When crossing a phase line (Phase 0 → 1, V1 → V1.5, V1 ships, etc.):
- Do a full refresh of the master plan to reflect everything that hardened during the previous phase
- Update the "Last refreshed" date at the top
- Commit the plan to `~/.claude/` git repo (the plans dir is tracked)

### When new ideas come up during any session:
- Immediately add to `docs/idea-backlog.md` under "Incoming"
- Don't let good ideas get lost in conversation — capture them in the backlog before moving on
- Ideas from the current phase that belong in future phases go into the backlog with the right phase tag
- Never delete ideas — mark as deprioritized with a reason, or mark as SHIPPED

### When architecture decisions affect future phases:
- Note the dependency in `docs/decisions.md` with a "Future Impact" line
- Cross-reference in the relevant phase section of `docs/roadmap.md`
- If a decision constrains or enables a future idea, note that on the idea in `docs/idea-backlog.md`

---

## Plan Hierarchy

Plans live in `docs/plans/` at three levels. See `docs/plans/README.md` for the full index.

1. **Phase Plans** — one per major phase (V1, V1.5, V2, etc.). Created before starting a phase.
2. **Feature Plans** — one per significant feature. Created when ready to build.
3. **Spike / Research Plans** — for technical investigations or design explorations.

**Rules for planning:**
- Every plan references `docs/roadmap.md` (overall direction) to stay grounded in the big picture
- Every plan references relevant research from `reference/` when making decisions
- When going deep on a specific feature, re-read the roadmap first to ensure alignment
- Plans are never deleted — mark completed with date, or note changes at the top
- When starting a new phase plan, review ALL unphased ideas in `docs/idea-backlog.md` to slot them

---

## Key Project Files

### Master Plan (strategic roadmap)
- **`~/.claude/plans/purrfect-hatching-ladybug.md`** — The strategic roadmap for the project. Contains product strategy, phased roadmap (V1-V4), technical research findings, feature details, and validation approach (the design operating model it describes is superseded — see `docs/design/design-workflow.md`). **Refreshed at phase boundaries, not session-by-session.** For session-level state (what's in flight, what's next, what got decided this week), use the `docs/` files below. See "Document roles" in Session Protocol.

### Tracking & Context (read these to restore context)
- `docs/scope-v1.md` — **Release 1 scope hub**: phase spine (1A–1F) w/ milestones + dates, per-phase checklists, release DoD, explicit out-of-scope, post-MVP gate + V1.5 preview, change log. Linked at every session start.
- `docs/scope-<phase>.md` — **Active phase's scope detail**: in-scope features + acceptance criteria + deferrals + change log. One per phase (currently `scope-1C.md`); created at phase start, closed at phase exit.
- `docs/changelog.md` — Session-by-session log of decisions and progress
- `docs/whats-next.md` — What to do in the next session (always current)
- `docs/decisions.md` — All confirmed product and technical decisions
- `docs/open-questions.md` — Unresolved questions that need discussion
- `docs/bug-tracker.md` — **Every parked defect/risk** with repro + severity + "address by" target + open/closed status. Reproducible bugs live here (distinct from idea-backlog = features, open-questions = decisions). Reviewed + updated every session end.
- `docs/discovery-log.md` — Griffin's preferences, opinions on competitors, UX taste profile (Phase 0)

### Product Direction
- `docs/roadmap.md` — The phased product roadmap (V1 through V4)
- `docs/idea-backlog.md` — ALL ideas with phase assignment, status, and source. Nothing gets lost here.
- `docs/feature-ideas.md` — (Legacy, superseded by idea-backlog.md. Keep for reference.)

### Plans
- `docs/plans/README.md` — Index of all plans (phase, feature, spike)
- `docs/plans/*.md` — Individual plan files

### Research & Reference
- `reference/Meal Management Cooking App Deep Research and Competitor Synthesis .md` — **GOLD MINE.** Competitor analysis, user feedback, feature validation. Reference this when making product decisions.
- `reference/grocery-notes-research.md` — Academic/behavioral research on grocery shopping and meal planning. Reference for understanding user behavior.
- `docs/technical-research.md` — Our own technical research (LLM capabilities, grocery APIs, cost analysis)

### Design Operating Model — Claude Design (canonical: `docs/design/design-workflow.md`)
- Claude Code = source of truth + build. **Claude Design** (claude.ai/design) = Griffin's visual iteration surface; it reads our design system straight from code. **ONE plain app project for the whole app** (GitHub-connected + `docs/design/PROJECT-CONTEXT.md`); surfaces separated on the Claude Code side under `docs/design/surfaces/<surface>/`.
- Two-way bridge: **Code→Design** = Claude Design's native GitHub connector + PROJECT-CONTEXT. **Design→Code** (round-trip SOLVED via FFOS): `import-from-url` rejects the pasted app URL — use `DesignSync.get_file(projectId parsed from the URL, path="<name>.dc.html")`, extract `content`, save to the surface folder. Never paste the generated `.dc.html`.
- **The gate (do this every time work is visual):** explicitly OFFER Griffin a design pass — with a recommendation, what it buys, and where returns diminish. Never silently skip, never auto-run. New surfaces = strong recommendation; in-pattern additions = lean skip (visual-qa catches drift). Griffin decides.
- Superseded the Figma Make model (2026-07-13). Figma MCP stays registered as an escape hatch only. Full loop, re-sync rule, and the 1F boundary are in `docs/design/design-workflow.md`.

### When to reference research:
- Making any product decision about feature scope or priority → check competitor synthesis
- Designing grocery list features → check grocery-notes-research for behavioral insights
- Choosing AI/integration approach → check technical-research.md
- Questioning whether a feature is validated → competitor synthesis has user sentiment data

---

## Technical Stack (Decided)
- Next.js (App Router) + TypeScript
- tRPC (API-first for multi-client)
- Supabase (Postgres + Auth + Realtime + Storage)
- Drizzle ORM
- shadcn/ui + Tailwind CSS
- LLM: TBD (prototyping on Gemini free tier, benchmarking GPT-4.1-mini / Gemini Flash / Claude)
- Vercel (deployment)

---

## Engineering Rules (Non-Negotiable)

These apply to ALL code. Hooks enforce the critical ones deterministically.

### Before Writing Code
- **Read before write.** Before creating or editing a file, read it AND its directory siblings. Search for existing implementations before creating new utilities/components.
- **Plan multi-file changes.** For changes touching 3+ files, state what you'll touch and why. Use plan mode + ultrathink for architectural decisions.

### While Writing Code
- **All mutations through tRPC.** No direct Drizzle calls from components. No Server Actions for mutations.
- **No duplication.** Search for existing patterns before writing new ones. Extract shared logic at 3+ repetitions.
- **300-line file limit** (non-test files). Split before adding more code.
- **Tests alongside code.** Every tRPC procedure, AI pipeline, and utility gets tests in the same commit.
- **No `any` types.** No `@ts-ignore`. No `as unknown as X`.

### After Writing Code
- **Run the gauntlet:** `npm run lint && npm run typecheck && npm run test:run` (hooks enforce this on commit, but run proactively).
- **Run the E2E suite when your change touches its coverage** (see "E2E test suite" below) and always at a feature/phase wrap.
- **Security self-check on auth/data code:** RLS policy? Zod validation? Service key not in client code?

### Auto-Invoke Rules (Claude does these without being asked)
- **Before any feature touching 3+ files:** Run `/architect` to validate the approach against project architecture.
- **When building UI/flows the E2E suite covers:** run `npm run test:e2e` before wrapping, and EXTEND the specs for the new behavior (a feature isn't done until its mechanics are covered). See "E2E test suite" below.
- **At the end of every build phase (1A, 1B, 1C, etc.):** Run `/review` for a multi-perspective code review AND run the full E2E suite (`npm run test:e2e`).
- **When Griffin corrects your approach:** Propose adding the correction as a permanent rule (compound learning).

### Griffin Invokes Explicitly
- **`/codex-review`** -- Codex second opinion at milestones (M1, M3, M6). Say "run codex review."
- **`/preflight`** -- Manual quality dry-run without committing.

### Everything Else Is Automatic
- **Pre-commit hooks** fire on every commit (no invocation needed)
- **`.claude/rules/`** load when matching files are touched (no invocation needed)
- **CLAUDE.md rules** are loaded every session (no invocation needed)

---

## E2E test suite (Playwright) — when to run it

There is an in-repo Playwright E2E harness (`tests/e2e/`, built Session 17; details in `docs/plans/spike-e2e-testing-harness.md` and `tests/e2e/harness/README.md`). It self-verifies real UI mechanics in a browser — the layer unit tests can't reach.

**Run `npm run test:e2e`** (self-contained: builds + starts its own server on 3102, deterministic AI mock, no OpenAI spend; ~1.5 min. After a build, `E2E_REUSE_BUILD=1 npm run test:e2e` skips the rebuild).

**Run it (without being asked) when:**
- Your change touches code the suite covers, OR
- You're wrapping a feature or closing a build phase, OR
- You touched drawers/sheets, the plan/AI pipeline, auth, or seeding.

**Coverage today:** the **Plan tab** — drawer dismissal (D1-D7), regenerate (RG1-RG5), the modify affordance (M1-M7). `docs/test-plan.md` is the 1:1 catalog. Other tabs (Recipes, Groceries) have no E2E coverage yet, so a change isolated to them won't be caught by this suite — extend the harness as those tabs mature.

**A feature isn't done until its mechanics are in the suite.** When you build new Plan-tab behavior, add/extend the spec in the same session. When a spec surfaces a real product question rather than a bug, mark it `test.fixme` with a comment and flag it for Griffin (don't weaken the assertion to force green).

**Not in the pre-commit hook on purpose:** it needs a build and is minutes-slow, so it's a relevant-change + wrap-time gate, not a per-commit one. The fast gauntlet (lint/typecheck/unit) stays the commit gate.

**Then visual QA (`/visual-qa`):** after mechanics are green, run the visual layer — it captures every Plan state, Claude LOOKS at the screenshots (behavior tests miss "the code says one thing, the screen shows another"), critiques against `docs/design/visual-qa-rubric.md`, and iterates to the bar (0 blockers + 0 high) before Griffin sees it. Layer A (mock) = layout/design; Layer B (real content, `E2E_LIVE_CAPTURE=1`) = content quality (chip phrasing, variety). Full loop in `.claude/commands/visual-qa.md`. So the flow is: **mechanics green → /visual-qa → ux-design-critic taste pass → hand to Griffin for taste.**

**The mechanical/taste split (Griffin's directive):** the harness owns *mechanical* verification (behavior AND now pixels) so Griffin no longer clicks every path or catches basic visual bugs. Use judgment to tell him when a feature is machine-verified and READY for his *functional/taste* review (does it read well, do chips sound like imperatives, does it feel right) — scope his pass to taste, don't hand him a full click script, and don't skip bringing him in.

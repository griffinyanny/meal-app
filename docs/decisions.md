# Decisions Log - Meal Management App

All confirmed product and technical decisions. Each entry includes the decision, rationale, and date.

---

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

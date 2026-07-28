# Open Questions - Meal Management App

Unresolved questions that need discussion or decision. Remove items as they get resolved (and add the decision to `decisions.md`).

---

## Needs Griffin's call

### Is library-into-plan formally in R1 scope? (raised S41)
**Question**: the 1E.5 design pass found that recipes flow **into** the library four ways and nothing flows
back out — there is no way to say "I want to cook this specific thing this week." Griffin's words: *"That
should be something that we include in R1."* It is now designed in full (picker, the chef's answer +
servings, pinned card, mixed week, regenerate-with-pins, modifying a meal you own, the chef pushing back),
but it has **never been added to a scope doc**, and the rule is that nothing gets built that isn't in one.
- **Cheaper than it looks**: `meal_plan_slots.recipeId` already FKs to `recipes`, and grocery generation
  reads ingredients off the recipe row — so it is UI plus a generation-prompt change, not a schema project.
- **Not free either**: it touches the **Recipes tab** (the verb takes its floating primary), the generation
  prompt (planning around fixed slots), `slotType` (no value means "the user chose this"), and the confirm
  path (a library recipe with no `normalized_ingredients` cache hits the normalize step — the exact latency
  BUG-004 exists to prevent).
- **Decide before 1E.5's scope doc is written**, since it changes the phase's size materially. Full detail
  in `idea-backlog.md` → Incoming (S41).

### Draft versus confirmed — the same week, twice (raised S41)
**Question**: every frame across both Plan design waves says `Draft ·`. Confirming is the single most
consequential action on the surface — it writes the grocery list — and the week that follows it currently
looks identical to the one before. The hard constraint says a Sunday view and a Wednesday view must look
*meaningfully different*; a draft and a confirmed week probably owe the same. How much visual change does
confirmation earn? Pulled into the consolidation pass, unanswered as of S41.

### Two small calls the finished Plan spec left open (raised S41)
Both are one-liners; recording them so they don't get lost between the design and the build.
- **Gold or cream for the landed ring?** Drawn gold in `3k`. It touches the three-mark budget for 400ms
  alongside the header orb. The sheet recommends it stays gold — the change was the chef's work, and a
  cream ring reads as a control you could press. **Claude agrees.** Griffin's call.
- **Do the picker's four browse tiles push a view, or filter in place?** Drawn as pushes. **Recommend
  push**: a pushed view carries its own section header and count, which is exactly what makes them read as
  doors rather than as filter chips (a chip implies subtraction from a list you can already see).

### Is tapping a day a browsing gesture or an editing one? (raised S41)
**Question**: the day sheet (`1l`) won over expand-in-place (`1m`) — but the design flagged its own caveat:
*"1l wins unless day-tapping turns out to be a browsing gesture rather than an editing one."* If users tap a
day mostly to *look* at it, a sheet is heavy for a glance and expand-in-place is right. Not answerable from a
static frame; it wants the interactive prototype or real use. Low stakes to reverse before build, high after.

### Does the week-wrapped screen imply cost tracking we don't have? (raised S41)
**Question**: the week-wrapped close-out shows `12 cooked · 3 skipped · $94 spent`, and the review screen's
status row carries `~$87`. **We have no cost model for a recipe, a plan, or a grocery list** — those numbers
are currently fictional. Either drop them from the design or scope real estimation. Related: the LLM
cost-per-user model (idea-backlog, S35) is about *our* costs, not the user's groceries — this is a different
number. Pairs with grocery ordering (V2), where real prices would arrive anyway.

### The gold budget: Design Spec v1.0 vs the reflect design you locked (raised S40)
> **Update (S41): the Plan pass produced a resolving line.** Griffin's call was to keep the chef's gold
> italic rationale on Plan and not shrink the surface to fit §06-C — because **law 03 explicitly grants the
> italic rationale colour**, so the spec contradicts itself rather than Plan violating it. The line that
> resolves both surfaces: **gold marks the chef *speaking*, not content you read.** Applied to the four
> onboarding conflicts below, that keeps the orb, byline and hook gold and drops `SO HERE'S YOUR WEEK`'s
> week list to `text.primary` — it is a list of decisions you read, not the chef's italic voice. That is the
> "middle path" already described at the bottom of this entry, now with a principle behind it rather than a
> budget count. **Still needs Griffin's explicit ratification before 1E.7 copies it onto five surfaces.**
> Recorded in decisions.md (S41).

**Question**: four places in onboarding use gold in ways **Design Spec v1.0 forbids**, and in every one of
them the build is faithful to a **Claude Design pass you ran**. The spec says it wins where an earlier
screen disagrees — but it was authored in the same session as the reflect design, so "earlier" is doing no
work here. Which one is authoritative?
- **The big one: `SO HERE'S YOUR WEEK` renders three to six lines of gold body text** (six on the deep
  state), plus gold arrows. Law 03 says nothing you read twice is accent-coloured and reserves body-sized
  gold for the chef's *italic rationale*; these are not italic. Law 06 caps gold at **three marks in the
  content layer** and this block alone blows it.
- The intro's three explainer rows sit in **gold icon tiles** — decorative containers (law 05) carrying
  gold on non-chef elements (law 02). Note the reflect screen's own guesses list already does this the
  spec-correct way with bare muted icons, so the flow disagrees with itself.
- The **baby-stage chips are gold controls**; every other selected chip in the interview is cream or
  semantic red, so this is the one outlier. (The amber note containing them is correct — gold.soft is
  defined as the chef's speech container.)
- The caught-tray's `Thai` chip is a value wearing a gold pill.
- **A middle path, if you want the payoff to keep its presence:** mute the arrows and drop the week
  decisions to `text.primary`, keeping gold on the eyebrow, the orb and the hook. The block keeps its
  structure and the screen lands inside the budget.
- **Why it's not just cosmetics:** 1E.7 sweeps this palette app-wide and onboarding is its worked example.
  Whatever you decide here gets copied onto five surfaces. Decide before 1E.7 starts.

### Three exits on one deep-round turn (raised S40)
A deep question shows "Skip for now" (top right), "I'm good for now, build my week", and "Skip this
question". The first two both end the interview and build a week; the difference — defaults vs keeping
what you've said — is not legible from the labels. Suppress the top-right one during the deep round?

### How often do two adults in a household actually eat the same dinner? (raised S39)
**Question**: Griffin's household always eats the same thing. Is that typical, or do a meaningful share of couples
cook two different dinners? This decides how much V1.5 household sharing has to *do*: if one shared plan is the norm,
sharing is a visibility and coordination feature; if divergence is common, it's a per-member planning feature and a
much bigger build.
- **Our own research doesn't answer it.** The competitor synthesis and the grocery-behavior research say nothing
  about intra-household meal divergence; the pricing research only notes that 2-person sharing is a paid-tier
  differentiator. So this needs either desk research or asking real couples.
- **Not an R1 blocker** — R1 is two solo accounts and Griffin's wife will test on his phone (S39 decision). It is a
  **V1.5 scoping** input, and worth answering before that phase is planned rather than during it.
- Related, and only live once two users share a household: `user_preferences` is keyed per user and
  `getChefContext(db, household, user)` takes both, so whose diet governs a shared plan is undefined today.
  Allergies are the easy half (union them and over-protect); diet, cook-time ceiling and cuisines are not.

### Ingredient-cache scoping — global vs household (BUG-004 #3, deferred to Phase E)
**Question**: The follow-up ingredient cache (#3) is most valuable **global** (an onion normalizes the same for every
household; item strings carry no PII), but a global table violates our drizzle-schema rule that every table has a
`household_id` + RLS. So: household-scoped (rule-clean, lower hit-rate) or genuinely global (best hit-rate, needs a
documented public-read / service-role-write exception)?
- Not urgent — #3 is a compounding follow-up, not part of the S29 latency fix. Decide when we pick up #3.
- Flagged now so it isn't decided silently inside a build session. Resolve → decisions.md.

### D7 — background scroll behind an open sheet (Session 17 E2E finding)
**Question**: The harness proved the background DOES scroll while a bottom sheet is open — the Session 16 note that the scrim blocks it was wrong (`modal={false}+noBodyStyles`, the fix for the D3 pointer-lockup, means nothing stops window scroll). Accept it as the trade for click-outside, or re-lock it?
- Option A: accept (scrolling background behind a non-modal sheet is common and harmless).
- Option B: re-lock via a scrim `onWheel`/`onTouchMove` `preventDefault` — safe, does NOT reintroduce the D3 body-pointer-events lockup.
- The D7 spec is `test.fixme`, ready to verify whichever way you go. Resolve → move to decisions.md.

---

## Product / UX

### AI Interaction Model (High Priority — blocks V1 UI design)
**Question**: When a user triggers an AI action (e.g., clicks "Edit" on a recipe), what happens?
- Option A: Opens a contextual chat thread ("What do you want to change?")
- Option B: Opens a structured wizard/form
- Option C: Hybrid — simple edits get inline controls, complex modifications open a chat
- Sub-question: Should there be a general-purpose AI chat accessible from anywhere (like Function Health's AI tab)?
- Sub-question: If a contextual AI suggestion is shown and user clicks it, does that open a chat?
**Status**: DIRECTION DECIDED (Session 3, 2026-03-30). "AI generates the UI" — dynamic personalized proposals, not chat-first and not static. User reacts/tweaks/confirms. Chat-first was debated and rejected (speed concerns, repeat-use tedium). Specific screen-level designs still need prototyping in Figma.
**Raised**: Session 1 (2026-03-28), deepened Session 2 (2026-03-29), direction set Session 3 (2026-03-30)

### AI Interaction Surface Paradigm
**Question**: How does AI show up across all screens? What replaces the persistent chat bar / sparkle button?
**Status**: RESOLVED (Session 8, 2026-05-26). **"Content IS the Conversation"** — layered interaction model:
- Primary (70%): Direct manipulation on AI-generated cards (swipe, tap, chips)
- Secondary (20%): "Talk to the Chef" — named, visible free-form input on hero card
- Tertiary (10%): Structured multi-turn clarification through tappable option cards
- Chef's voice woven through UI at three levels (plan, card, change)
- Screen adapts to state (no plan → input-led; plan exists → plan-led)
- Validated by ChatGPT deep research on AI-native UI paradigms + 6 Figma Make prototypes
- "Talk to the Chef" is a working label — final naming TBD
**Raised**: Session 7 (2026-05-25), resolved Session 8 (2026-05-26)

### Card Tap Interaction Model
**Question**: When you tap a meal card on the Plan screen, what happens? Does it open the recipe, or does it open an AI interaction surface?
**Status**: RESOLVED (Session 8, 2026-05-26). **Both — expanded card bottom sheet combines recipe preview + AI-generated contextual actions.** Tapping a card opens a glass bottom sheet (~70% of screen) showing: recipe hero image, title, rationale, meta, ingredient pills, PLUS AI-generated contextual action chips specific to that card. Actions differ per meal (e.g., "Start cooking" only appears for tonight's meal; "I didn't cook Monday's chicken" only appears if that's relevant). Escape hatch: "Something else? Tell your chef" opens Talk to the Chef scoped to that card.
**Raised**: Session 8 (2026-05-26)

### Information Architecture (High Priority — blocks screen-level design)
**Question**: What is the overall app structure? What are the primary tabs/sections? Is there a home page, and if so what does it show? How do Recipe Library, Meal Planning, Grocery List, and Preferences/Memory relate to each other in navigation?
**Status**: RESOLVED (Session 6, 2026-04-12). **Plan | Recipes | Groceries | You.** Four tabs, four nouns. Plan is the landing screen. No Home tab (junk-drawer risk). AI input bar is contextual per screen, general on Plan. Pantry (V1.5) lives inside Groceries. Cook mode is an overlay from recipe detail. Stress-tested against all V1–V4 features + unphased ideas — nothing requires a 5th tab. See `decisions.md` for full rationale.
**Raised**: Session 4 (2026-03-30)

### Memory System Architecture
**Question**: How do we build the persistent memory/context system? This is product-defining — the AI needs to track preferences, brand choices, recipe opinions, indirect signals ("I didn't like that") across sessions. Needs both an AI-readable store and a user-facing audit view. How much of this is LLM conversation history vs. structured database fields vs. a vector store?
**Status**: Open. Identified as critical in Session 2 but no architecture decision yet.
**Raised**: Session 2 (2026-03-29)

### App Name / Branding
**Question**: What should the app be called?
**Status**: Deferred. Using "meal-app" as working name.
**Raised**: Session 1 (2026-03-28)

### Free-Form vs. Structured List Entry
**Question**: How do users add items to the grocery list? A structured catalog (pick from ingredients) helps with normalization, merging, and nutrition data — but adds friction vs. just typing "milk." Free-text entry is fast but harder to normalize. A dual mode feels like odd CX. What's the right solve?
**Status**: RESOLVED (Session 22, 2026-07-20). **Free-form + AI tidy.** Type anything → optimistic insert → background AI categorize/dedupe. No structured catalog picker (that's the V1.5+/Instacart-era evolution; 1D builds only the canonical `name` vs `rawName` seam). Confirmed by the imported Groceries design. See `decisions.md` (2026-07-20) + `scope-1D.md`.
**Raised**: Session 2 (2026-03-29)

### AI-First Preferences vs. Static Settings UI
**Question**: Should preferences (dietary rules, brand preferences, store layout, etc.) be managed primarily through AI conversation ("I don't eat gluten anymore") rather than traditional settings screens? Griffin's instinct is yes — people want to say a thing and have it happen. But this requires training users on what's possible, and some people will want to see/verify their preferences in a structured view.
**Status**: RESOLVED (Session 32, 2026-07-22). **Hybrid — AI-first capture, structured audit, split by data type.** Capture is conversational (onboarding interview / Talk-to-Chef / implicit thumbs); the You tab is the trust/audit surface, not the primary editor. Hard constraints (dietary, allergies, household size, cook-times, cuisines) are AI-set but **always directly editable** (safety-critical); soft memory is an AI-captured, correctable ledger. Infra already reflects it (`user_preferences` + `ai_memories`). See decisions.md (S32) + `scope-1E.md` (the framing decision).
**Raised**: Session 2 (2026-03-29)

### Avoiding the Linear Golden Path Trap
**Question**: How do we make meal planning flexible and non-linear? Users should be able to enter the flow at any point, iterate, and not feel locked into a rigid step-by-step process. Long wizard-style flows are probably worse than open-ended flexible ones. But some structure helps new users. How do we balance?
**Status**: Open. Critical UX question for V1.
**Raised**: Session 2 (2026-03-29)

### Recipe Discovery Model (New — raised by Cooklist walkthrough)
**Question**: Do we need a built-in recipe catalog/browse experience, or do we lean into AI-generated recipes + external import (URL, photo, social) and let users do "discovery" elsewhere? Cooklist has an infinite scroll catalog. Griffin's instinct: "Do people want to browse 100 steak recipes, or do they want recommendations based on what they're feeling?" If someone is already looking at a steak recipe, do they want more steak recipes or something complementary? This has huge implications for what we build and how we differentiate.
**Status**: Open. Fundamental product question. Needs market signal — is browse/discover a retention driver, or is it table stakes that AI can replace?
**Raised**: Session 5 (2026-04-05)

### Pantry in IA: Dedicated Tab vs. Embedded Capability
**Question**: Cooklist dedicates an entire tab to Pantry. Is a dedicated pantry section necessary, or should pantry be an invisible background capability?
**Status**: RESOLVED (Session 6, 2026-04-12). Pantry lives as a section/toggle within Groceries tab. "What I have" is the flip side of "what I need to buy" — same data, different views. No dedicated tab. Pantry data informs AI planning (auto-subtraction from lists) without requiring user management. See IA decision in `decisions.md`.
**Raised**: Session 5 (2026-04-05)

### Retailer Account Linking: Setup vs. Checkout
**Question**: Should users link their grocery store accounts (Target, Kroger, etc.) during initial onboarding/profile setup or at the point of checkout? Cooklist does it at checkout (web view login with email code), which is very clunky. Pre-linking in profile/settings would make checkout frictionless but adds to onboarding weight. What's the right balance? Could we do progressive linking — first checkout triggers the link, then it's remembered?
**Status**: Open. V2 concern but worth thinking about architecturally.
**Raised**: Session 5 (2026-04-05)

### Platform Sequencing: Web-First vs. iOS-First (New — raised Session 5)
**Question**: Griffin's design direction is deeply iOS-native (liquid glass, glass-morphism, Crouton/Flighty aesthetic). The current plan is web-first (phone form factor) → iOS later. But if the target aesthetic is fundamentally iOS-native, can a web app deliver an acceptable experience, or should we go straight to iOS?
**Status**: RESOLVED (Session 5, 2026-04-05). **Web-first confirmed.** Griffin is comfortable with Crouton/Flighty-inspired design *patterns* (dark mode, clean typography, limited palette, smart inline features) without needing to nail liquid glass polish on web. Native-level visual polish comes when we go iOS. Web app should look and feel like those apps conceptually, not pixel-perfectly. Added to `decisions.md`.
**Raised**: Session 5 (2026-04-05)

### Onboarding Flow
**Question**: What should the first 5 minutes look like? UX designer suggested: have user paste one recipe URL, watch AI extract it, show what a meal plan + grocery list looks like. Griffin mentioned "baby mode" with dynamic onboarding (combo chat + fixed UI). **Live now — the #4 onboarding interview is the last 1E feature and gets designed next.** Griffin's S35 (2026-07-24) considerations to weigh in that pass (also appended raw to `design/surfaces/onboarding/brief.md`):
- **Gate vs. open door.** His anti-pattern: Cooklist/Mealtime wall you out of the app until you finish a long setup (incl. pantry). He wants to *see what he's got* before committing. Our interview is already skippable — the design should make the skip-to-app path first-class and decide how much value-prop to sell up front vs. letting intrigue + a fast payoff pull the user in. (Hard gate lifts completion but costs new users; open door is the reverse.)
- **Value-prop pitch placement.** A moment that sells the agentic value, not just captures data — inline in the intro, a one-card pitch, or pushed to the separate chef tour (below).
- **First-run interview vs. dynamic chef tour are two different things.** The interview *learns you* (#4); a tab-by-tab walkthrough with demo states + "you can always just talk to me / dictate" *teaches the app + sells the value* — tracked as its own idea-backlog feature (S35), likely post-MVP. Don't overload #4 with the tour.
- **Progressive disclosure cadence.** How later features (e.g. "copy a recipe link into the app") get taught over time without a front-loaded tour — the friction-vs-understanding tradeoff. Separate backlog item (S35).

**Status**: #4 interview is design-gated and next up (see whats-next + `scope-1E.md`); the broader gate/value-prop/tour/disclosure questions above are open and split across the onboarding brief + idea-backlog.
**Raised**: Session 1 (2026-03-28); **expanded Session 35 (2026-07-24)**

### Monetization Details
**Question**: What features are free vs. paid? What's the pricing? Free trial length? **Expanded S35 (2026-07-24) with the specific sub-questions Griffin wants answered before charging:**
- **What is the bare MVP that justifies a charge?** If it's still just recipe generation + a list, is that valuable enough? If it's generation + storage + note creation + planning, does that clear the bar? Where's the line?
- **Is grocery-store integration (Instacart / Kroger / other) a hard requirement to justify the price** — or can we charge on the planning/list intelligence alone? (Ordering is V2 today; this asks whether monetization is gated on pulling it forward.)
- **Cost-per-user must sit below the price with margin.** Requires the LLM cost-per-user model (idea-backlog, S35) so a heavy user can't run us negative — the abuse ceiling. Pricing can't be set until that number exists.
- Free vs. paid split, trial length, and the freemium boundary all sit downstream of the two questions above.
- **How do we test any of this?** Griffin (S37) wants pricing A/B tests once the native build productionalizes —
  third-party vendor, not homegrown. Vendor choice + integration design is its own piece of work (idea-backlog, S37).

**Status**: Deferred to the post-MVP gate (after R1 validates the core loop) — but the sub-questions above are the actual work, and they depend on the cost model + a call on ordering-as-gate. Reference: `reference/meal-app-pricing-research.md`.
**Raised**: Session 1 (2026-03-28); **expanded Session 35 (2026-07-24)**

### Color / palette scheme — amber + blue, or something else (1F decision)
**Question**: The onboarding pass surfaced an **amber-plus-blue** palette layered on the existing dark system — amber (ember/`#E8944A`/`#F2B279`) as the **chef-presence / warmth** signal (orb, eyebrows, value-meter), blue (`#3A86FF`) as the **action** color (CTAs). Is amber+blue the right scheme for the app, or does the palette want a rethink?
- **Semantic split is the strong argument to keep both:** amber = "the chef is present," blue = "you act." That gives amber a *job*, not just decoration — worth preserving regardless of the final hues.
- **Risk to test:** when both amber and blue run saturated, "what's the primary action?" can blur — hierarchy discipline needed.
- **Where it's decided:** **1F design-system pass** (palette is explicitly the 1F "one system exercise"; PROJECT-CONTEXT holds the palette SETTLED until then). Deciding it now would mean re-theming four already-built tabs piecemeal.
- **But explore now:** a dedicated Claude Design color play can run during the current design work so **1E.5 (Plan re-design) stays compatible** and we don't lock Plan's look right before a repaint. Explore now → lock 1F. Resolve → decisions.md.
**Raised**: Session 35 (2026-07-24)

## Technical

### PWA vs. React Native for Mobile
**Question**: Should V1-V2 web app be a PWA (add-to-home-screen, push notifications) to defer native app investment? Or commit to React Native earlier?
**Status**: Decision deferred. Build web app first, evaluate whether PWA covers 80% of native needs.
**Raised**: Session 1 (2026-03-28)

### Instacart Integration Feasibility
**Question**: What's the current state of Instacart's developer program / API? Is direct cart integration possible, or do we need deep-link/affiliate approach?
**Status**: RESEARCHED. Instacart requires business partnership (not self-serve). Kroger has the only real open API. Path: V1 no integration, V2 Kroger API + deep links, pursue Instacart partnership with traction. See `technical-research.md`.
**Raised**: Session 1 (2026-03-28)

### LLM Platform Selection
**Question**: Which LLM provider(s) to use for production? Current recommendation is tiered routing (GPT-4.1-mini for routine, Claude Sonnet for complex). Need to benchmark on actual recipe tasks before deciding.
**Status**: Research done. Decision deferred to prototyping phase. Will test on Gemini free tier first, then benchmark.
**Raised**: Session 1 (2026-03-28)

### Dictation implementation approach (S35)
**Question**: Dictation is a core interaction bet (multiple voice ideas in idea-backlog: "Dictation/voice-first input emphasis" S2, "Voice dictation for feedback and modifications" S3, "AI-first preferences" capture). Griffin wants it to be *really good*. **How do we actually build it?**
- **Simplest path: invoke native iPhone/OS dictation** (the platform speech-to-text on the keyboard) — free, zero infra, but quality/UX is the OS's, not ours, and it's device-dependent.
- **Higher-ceiling path: a strong open-source voice-to-text model** (e.g. Whisper-class). Better/consistent quality, but **where does it run** — do we host it, and at what cost/latency? (Wispr Flow-style productized dictation likely isn't usable for us.)
- What do apps with excellent baked-in dictation actually do — are there common paradigms (on-device model, streaming to a hosted STT, hybrid)?
- **Cost ties into the LLM cost-per-user model** (idea-backlog, S35): a hosted STT is another per-use cost to fold into unit economics.
**Status**: Open — research + a build/host decision needed before voice input ships. Not scoped into R1 (voice is a principle, not yet a built feature).
**Raised**: Session 35 (2026-07-24)

### ~~Household composition schema~~ — RESOLVED (S36) → decisions.md
**Resolved as BAND COUNTS, not age arrays.** The recommendation above said `children[ageYears] / babies[ageMonths]`,
but the **locked design (1D) captures three stepper counts with no age-entry UI** — storing arrays the UI can never
populate would mean fabricating data. Shipped: `{adults, children, babies, babyStage}` on `user_preferences`, with
`householdSize` derived server-side. V1.5 Family Member Profiles extends the same JSONB with an optional `members`
array (additive, no breaking migration). Griffin ratified.

Griffin also reframed the servings half of the question rather than answering it: whether a baby counts depends on the
baby's **age**, so a conditional **baby-stage follow-up** (Under 6m / 6-12m / 12-24m) was added — under 6m and 6-12m
contribute 0 servings, 12-24m counts. That follow-up is an **addition to the locked design**, flagged for his taste
pass. Full rationale in decisions.md (S36).

### Regenerate / "new plan" entry point (V1 blocker)
**Question**: Where does "plan a new week" live once a plan already exists? `NoPlanState` only shows when there's no plan, so today the plan dead-ends after week one. Related: should a new generation replace the current plan (backend already does this) or archive it for history? And how does an elapsed/all-past confirmed plan invite a fresh week instead of showing a nonsensical mid-week view?
**Status**: OPEN — surfaced in Session 15 (Test 8 couldn't run without it). Backend replace-on-generate is implemented; the gap is UI + interaction design. Deferred to a design-led build pass with ux-design-critic. Tracked in `idea-backlog.md` as a V1 blocker.
**Raised**: Session 15 (2026-07-06)

# Idea Backlog - Meal Management App

This is the living backlog of ALL ideas — from initial planning, from sessions, from research, from anywhere. Ideas never get deleted from here. They get slotted into a phase, marked as deprioritized (with reason), or left as unphased for future consideration.

**How this works:**
- New ideas get added to "Incoming" with the session they came from
- During planning for each phase, we review the backlog and slot ideas into phases
- Ideas that influenced a shipped feature get marked SHIPPED with a link to what was built
- Ideas that were explicitly rejected get marked REJECTED with a reason
- Everything else stays in the backlog — nothing falls through the cracks

---

## Incoming (New ideas not yet slotted)

| Idea | Source | Notes |
|------|--------|-------|
| Expanded-card structural action model (move day / servings / cook now / grocery) | Session 18 (2026-07-10) | Griffin: the expanded sheet's "What would you like to do?" is too narrow — it only offers recipe-modify chips + a generic swap, but the real jobs are also **cook this now**, **move it to another day**, **cook it for more people**, **add to grocery list**. The Figma State-5 brief (docs/design/brief-plan-states.md) specced exactly these as structural actions alongside the AI-generated chips. Needs a product/design decision: which actions are structural (always present, deterministic UI) vs AI-generated (contextual chips), and what's buildable now vs gated (grocery action needs 1D; cook-now needs Cook Mode). Discussed S18, deliberately not built — candidate for late-1C or a 1C follow-on. |
| Move-a-meal-to-another-day flow | Session 18 (2026-07-10) | Subset of the action-model item but its own build: "Move to another day" → day pills (per State-5 brief), possibly drag-and-drop on the week list later. Griffin explicitly deferred ("don't know if we want to deal with this now"). Data model supports it (slots keyed by date; modify already replaces by dayOffset) — the work is UX + a targeted non-AI mutation (a move shouldn't cost an LLM round-trip). |
| Plan-generation variety miss — 7× "Grilled ___ Salad" in one week | Session 18 (2026-07-10) | Griffin's live plan: every one of 7 meals was a grilled salad. The prompt already says "build variety — don't repeat protein or cuisine back-to-back" and the model blew through it (likely anchored on a grill/salad-ish request or memory). Undercuts the "AI proposals are good" bet harder than chip phrasing. Levers: strengthen the variety rule (vary the dish FORM — salad/pasta/stir-fry/roast — not just protein), few-shot a good week, or eval a stronger model for plan-generate. Pairs with "tune recipe generation quality." |
| ✅ **SHIPPED (S17)** — Dev-only debug HUD (copyable state blob, hotkey-toggled) | Session 16 (2026-07-08), SHIPPED Session 17 (2026-07-09) | Shipped: `useDebugPanel(section, getter)` registry + `DebugHud` mounted in the app shell; toggle Cmd/Ctrl+Shift+D or 🐛; Copy → JSON snapshot. Plan tab publishes derivedState/planId/status/slots/pending/changedDates/ack/error + todayUTC-vs-local. Gated dev / `NEXT_PUBLIC_DEBUG_HUD` / `localStorage debug-hud=1` (runtime flag lets Griffin flip it on his phone without a rebuild); off by default = prod-safe. New surface = one `useDebugPanel()` call. |
| Extend E2E coverage to Recipes + Groceries tabs | Session 17 (2026-07-09) | The harness infra (auth bypass, seed client, AI-mock seam, config, HUD) is generic — only per-tab pieces are unwritten. Each tab needs: (1) AI-mock fixtures for its tasks (the mock throws for unrecognized tasks — Recipes uses recipe-generate/recipe-modify/parse-recipe-url), (2) a seed-state builder for its tables, (3) a test-plan catalog + specs (Recipes/Groceries flows are "Not yet cataloged" in test-plan.md), (4) a few selectors/testids. Small per tab; do it when actively building on that tab. Recipes is furthest along (Phase 1B built). |
| API consistency: recipe.get returns null vs NOT_FOUND elsewhere | Session 14 (2026-07-06) | `recipe.get` returns `null` for a missing/foreign recipe while `favorite`/`delete`/`confirm` throw NOT_FOUND. Surfaced while writing router tests. Harmless today (UI handles null), but pick one convention and align before more procedures copy either pattern. Small, do during 1D touch of the recipe router. |
| ✅ **SHIPPED (S16)** — "Something is happening" affordance for all AI mutations (MACRO) | Session 12 (2026-05-29), expanded Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08) | The biggest UX gap in the Plan tab. When any AI modify fires, `handleModify` closes the sheet and the mutation runs 2-5s with **zero in-context feedback** — `modifyMutation.isPending` is only surfaced inside the sheets, so once they close the main screen is idle, then the change silently appears (Griffin S15: "if you're not paying attention you might not even notice"). Two parts. (1) **Immediate working-state on the thing you touched.** The tapped element should react instantly: card chip → chip becomes a spinner / card enters a loading state; expanded-sheet action, Talk-to-Chef send, single-day modify all likewise. (2) **Contextual progress that lives where the user is looking, not a top-of-page toast** (Griffin: "something pops up at the top where I might not even be scrolled to"). Prefer in-place on the affected card; make it contextual to the change ("Adding Sunday's dinner…", "Making it tofu…"). Options to design: card-anchored spinner/skeleton, in-place pill spinner, bottom-anchored toast as secondary confirm-on-done. **S15 concrete finding (Test 4):** the in-sheet "Reworking your plan…" text is effectively unreachable on the modify path — `handleModify` calls `setChatOpen(false)`/`setExpandedOpen(false)` BEFORE the mutation resolves, so the sheet is gone before the pending text can render. Meanwhile the success ack is a top-of-page toast the user can't see when scrolled down (Griffin: "I don't see the top of the screen when I'm scrolled down"). Net: today there is NO reachable pending state anywhere for a modify. The fix must put pending state somewhere persistent and scroll-independent (in-place on the card, or a fixed bottom-anchored element), not inside a sheet we immediately close. **Data constraint for the designer/build:** scoped modifies (card chip, meal-scoped chat) know the target day/meal up front, so in-place works; general Talk-to-Chef doesn't know which day changes until the AI responds, so it needs a general progress affordance until the result lands. Applies to ALL modify paths. **Cross-cutting → consult ux-design-critic before building; this sets the app-wide pattern.** |
| ✅ **SHIPPED (S18)** — Meal chips read as bare adjectives, not tappable actions | Session 15 (2026-07-06), confirmed on fresh generation + prompt hardened Session 18 (2026-07-10) | Session 18 answered the open question: Griffin's live mid-week plan (fresh July generation) still had "plant-based" / "light" / "iron-rich" chips — gpt-4.1-mini drifts to attributes despite imperative examples. **Deliberate prompt change shipped** (chef-system.ts): chips must be verb-first imperative ACTIONS; bare attributes/nutrition labels explicitly banned with wrong-examples; "never offer a quality the dish already has" (a light salad doesn't get "Make it lighter"); modify-prompt got the same chip rule + a title guard (never bolt request wording onto the title — the "Iron-Rich Grilled Steak" failure). Prompt tests pin all three rules. Caveat: AI output quality verifies by fresh generations over time, not E2E (harness uses fixtures) — if drift persists, next lever is few-shot examples or a stronger model for plan tasks. |
| ✅ **SHIPPED (S16)** — No regenerate / "new plan" entry point once a plan exists (V1 BLOCKER) | Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08): end-of-list "Start over →"/"Plan a new week →" → re-prompt via intent screen; replace-on-generate; unblocks Test 8 | Test 8: discovered the Plan tab has no way to start a new plan once one exists. `NoPlanState` (the generate UI) only renders when `plan.current` is null; after that you only ever see PlanReview or PlanMidweek, neither of which offers regenerate/new-week. The backend stream route can generate, but there's no UI trigger. Breaks the weekly ritual (the north star): after week 1 the plan's days elapse and there's no forward path — you're stuck on a past plan (see all-past item below). Needs a design + build decision: where does "plan next week" live, and does a new generation replace the current plan (one-active-plan rule) or archive it? This is the actual content of Test 8, which cannot run until the entry point exists. Treat as a V1 must-fix, not polish. |
| ✅ **RESOLVED (S16)** — Confirmed plan entirely in the past renders a nonsensical mid-week view | Session 15 (2026-07-06), RESOLVED Session 16 (2026-07-08): `isPlanElapsed` gates a "week wrapped" state. (Timezone off-by-one in `timeframeOf` unchanged — still worth a look.) | Surfaced in Test 6 with the stale May-30 test plan. When a confirmed plan's days are ALL in the past, `isConfirmed && hasPast` flips it to PlanMidweek with every day under "EARLIER THIS WEEK" and an "Anything to adjust for the rest of the week?" prompt — meaningless for an elapsed week. There's no "this plan is over → start a new one" state. Related to the regenerate-entry-point blocker above; likely resolved together (an elapsed plan should invite a fresh week rather than present as current). Also watch: slot dates store as timestamps at UTC-midnight (displayed as prior-day 8pm Eastern) — verify the past/today/future boundary logic in plan-helpers isn't off-by-one across timezones during Test 7. |
| ✅ **SHIPPED (S16)** — Drawer dismissal affordances (X button + click-outside-to-close) | Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08): X moved into shared `DrawerContent` + focus order fixed; click-outside via a body-safe scrim (background-scroll-while-open traded away). ⚠️ click-outside not click-tested yet | Test 3R: Griffin flagged it's not obvious how to close a drawer. Today's only close paths are the subtle drag-handle bar (non-obvious with a mouse) and Escape. Two asks. (1) **Visible X close button** in the sheet header — LOW RISK, additive, `DrawerClose` primitive already exists; recommend building. Applies to both ExpandedMealSheet and TalkToChefSheet. (2) **Click background/outside to close** — NOT a free add. Outside-click dismissal is modal behavior; both sheets are deliberately `modal={false}` to fix the Test-3 two-drawer pointer-events lockup AND to allow background scroll (Griffin approved the scroll). Re-enabling outside-click risks reintroducing the lockup and killing background scroll. Needs a carefully-tested approach (possibly a custom lightweight overlay that closes on click without toggling body pointer-events), validated against the two-drawer stack. Design-pass item, not a bolt-on. **S15 review follow-ups (from the internal review of the shipped X):** (a) the X `DrawerClose` (icon + ~180-char className) is copy-pasted identically into both sheets — move it into the shared `DrawerContent` (shadcn's dialog does this) so new drawers inherit it; (b) the X is the first focusable child in DOM order, so keyboard/AT users land on "Close" before the sheet's heading — consider ordering/autofocus so the heading is reached first. Fold both into the drawer design pass. |
| Talk-to-Chef pills should auto-send on tap | Session 15 (2026-07-06) | Currently tapping a suggestion pill only fills the textarea (`setText(s)`); user must then hit send. Griffin wants a pill tap to submit immediately — "it's like clicking the submit button," since a pill is a complete self-contained instruction. Tradeoff: loses the ability to edit/combine pills before sending (minor for V1). Pairs with the affordance item above — on auto-send the working-state must show immediately. Recommend: pills fire on tap, textarea stays for freeform. |
| ~~Card touch target too small — only text opens the sheet~~ FIXED Session 15 | Session 15 (2026-07-06) | Test 3R: Griffin couldn't reliably open cards — tapping the top-right/padding did nothing, only tapping near the text worked (~10s of dead taps). Cause: only the text block was wrapped in the tap `<button>`; padding + chip row were dead zones. **Fixed** — whole card is now the tap target (`div[role=button]` + keyboard handler), chips `stopPropagation` to keep their own action. Logged as resolved, not open. |
| Visual polish: sticky confirm bar feels awkward against the tab bar | Session 12 (2026-05-29) | Griffin flagged during Test 1 that the sticky "X dinners · Looks good →" bar that appears when the hero scrolls off looks strange floating above the bottom tab bar. Functional pass, visual polish. Likely fixes: tighter integration with the tab bar (one combined surface), or a different reveal pattern (e.g., expand the tab bar instead of a separate floating pill). Capture for V1 polish pass. |
| Calendar-week-aligned planning ("next week starts Sunday") | Session 12 (2026-05-29) | V1 model is rolling-7-from-today (see decisions.md). Some users mentally plan in terms of calendar weeks ("what are we eating next week, Sun-Sat"). Consider an opt-in "next-week" mode where mid-week generation produces a plan that starts the upcoming Sunday and the current week stays untouched. Real mental model surfaced during Session 12 scoping — kept for post-V1 consideration. |
| User-selectable start day for the plan | Session 12 (2026-05-29) | Let the user pick when the plan begins instead of always "today." E.g., generate on Thursday, but explicitly tell the chef "starting Monday." Companion to calendar-week-aligned planning above. Deferred to post-V1. |
| User-selectable plan length (variable days) | Session 12 (2026-05-29) | Plan length is fixed at 7 days in V1 (decisions.md). Allow the user to say "plan 3 dinners," "plan through next Wednesday," or "plan the weekend." Combines with start-day above. Two routes: explicit config UI vs. infer from intent in the prompt. |
| Auto-infer plan duration and start from user intent | Session 12 (2026-05-29) | Rather than asking the user to configure days, let the chef pick duration/start from the request — "plan a dinner party Saturday" → 1 meal Saturday; "plan our week" → ~5 dinners starting today; "we're traveling Thursday-Sunday" → meals for Mon-Wed only. Combines length + start + skips. Harder to do well but matches the AI-first interaction model. |
| Concurrent plans / plan history (next-week-while-this-week) | Session 12 (2026-05-29) | V1 enforces one active plan per household. Some users want to draft next week while this week is still live, or look back at past weeks. Requires revisiting the data model (current `plan.current` returns a single plan; "active plan" concept would need explicit selection). Deferred. |
| Cost-effective food imagery for cards | Session 12 (2026-05-28) | Plan/recipe cards ship text-forward in V1, but the Figma mocks look notably better with food photos. Griffin wants a cost-effective way to support images later (NOT per-meal AI image generation — too expensive). Explore: stock food API matching, borrowing imported-recipe source images, a small curated image set keyed by cuisine/dish-type, or cheaper image models. Resolve before we'd consider it shippable. |
| Tune recipe generation quality | Session 11 (2026-05-27) | Generation works (gpt-4.1-mini) but output could be tuned — prompt refinement, output style, ingredient grouping, defaults. Griffin flagged "we'll want to tune this a bit." Phase 1B polish or later. |
| Nutrition data and macro tracking | Session 2 (2026-03-29) | Add nutritional info and macro tracking. Related to V3 nutrition engine but may warrant earlier lightweight version. |
| Free-form list entry (type anything) alongside structured catalog | Session 2 (2026-03-29) | Dual mode: structured ingredient picker AND free-text "just jot it down." Tension between normalization and speed. Needs design exploration. |
| Non-food household items on grocery list | Session 2 (2026-03-29) | This is your full store list — paper towels, cleaning supplies, etc. Not just recipe ingredients. |
| Auto-generated refinement pills / suggestion chips | Session 2 (2026-03-29) | Dynamic pills that narrow results: "healthy" → "dinner" → "grill" → "fast" → "chicken." Continuously update based on context. |
| AI-powered ingredient substitution (not a static carousel) | Session 2 (2026-03-29) | Context-aware swaps via AI rather than a fixed "related items" list. |
| "Capture most intent with AI" — AI-first preferences management | Session 2 (2026-03-29) | Instead of static settings UIs, let users say/type what they want and it happens. Preferences recalled and edited through AI. Potential core tenet. |
| Show prompt examples / discovery prompts | Session 2 (2026-03-29) | Show users how to ask for things: "I want to grill this week, let's jam." AI as a discovery partner. |
| Custom store layout capture via AI | Session 2 (2026-03-29) | "Tell me how your store is laid out" or learn from check-off order over time. |
| Learn preferred brands from merchant orders | Session 2 (2026-03-29) | After ordering, remember brand preferences (e.g., specific milk brand/type). Builds intelligence passively. |
| Handwritten list scanning | Session 2 (2026-03-29) | Scan a handwritten list and integrate into the system. Augments meal planning. |
| Flexible occasion-based planning (dinner parties, hosting, potlucks) | Session 2 (2026-03-29) | Not just weekly meal prep — handle "I'm having 8 people over Saturday, help me plan the full meal." Inspiration → recipes → list → cooking. |
| Learning user behavior passively (what they buy, skip, repeat) | Session 2 (2026-03-29) | System gets smarter over time without cumbersome tracking. Observe patterns from lists, check-offs, reorders. |
| Memory system — persistent user context | Session 2 (2026-03-29) | Core feature. Track preferences, brand choices, recipe opinions across sessions. Confirm to user when something is saved. Infrastructure for personalization. |
| AI-guided onboarding ("AI interview" format) | Session 2 (2026-03-29) | Conversational onboarding instead of static forms. Zillow data showed higher conversion + more data points captured. Guide but don't restrict. |
| Dictation/voice-first input emphasis | Session 2 (2026-03-29) | Emphasize dictation so users don't have to type. Not AI voice mode — just speech-to-text input. Forward-facing pattern. Further validated by Cooklist walkthrough (Session 5). |
| Dynamic UI elements within chat (not plain text chat) | Session 2 (2026-03-29) | Chat with rich inline elements: recipe cards, plan previews, suggestion chips, illustrations, motion. Not a ChatGPT clone. |
| Proactive context-aware suggestions | Session 2 (2026-03-29) | System maintains state and proactively suggests: "You only planned 2 meals — want to add more?" "You liked X last week — bring it back?" |
| User education on AI capabilities | Session 2 (2026-03-29) | People need to learn how dynamic the system is. Show examples, prompt templates, progressive disclosure of what's possible. |
| "AI generates the UI" — dynamic personalized proposals | Session 3 (2026-03-30) | Core interaction model. System presents pre-populated, opinionated proposals (meal plan, recipes, list). User reacts/tweaks/confirms. Gets faster over time. |
| Weekly check-in prompt ("How were your recipes?") | Session 3 (2026-03-30) | Lightweight start-of-week explicit feedback moment. Voice dictation or quick-tap options. Skippable. Framed as personal chef checking in, not a survey. Should sunset once system has enough data. |
| Voice dictation for feedback and modifications | Session 3 (2026-03-30) | Voice-first for check-ins, recipe modifications, and free-form input. Reduce typing friction. |
| "Personal chef" interaction framing | Session 3 (2026-03-30) | The system's tone and behavior should feel like a knowledgeable personal chef — not a chatbot, not a tool. Checks in naturally, remembers, adjusts. |
| Ingredient reuse optimization in meal planning | Session 5 (2026-04-05) | Plan meals that share ingredients (tortillas, eggs) to reduce grocery cost. "Mix and match" optimization. Observed in Cooklist. |
| Multi-provider authentication (Google, OTP) | Session 5 (2026-04-05) | Login should support Google SSO, one-time passcode, and other major providers. Research which providers matter most. |
| "Scan your fridge" AI pantry import | Session 5 (2026-04-05) | Take a photo of fridge, AI identifies contents and populates pantry. Saw in Cooklist. |
| Ingredient detail pages (related recipes + products) | Session 5 (2026-04-05) | Click an ingredient to see recipes using it and related products. Cross-referencing entity. Interesting concept from Cooklist. |
| In-app guided tour with screen highlights | Session 5 (2026-04-05) | Overlay-based progressive feature discovery. Cooklist does this — Griffin likes the pattern even if their execution is rough. |
| Pre-authenticated store accounts (setup, not checkout) | Session 5 (2026-04-05) | Link retailer accounts during onboarding/profile setup so checkout is frictionless. Avoid web view login during shopping flow. |
| Grocery spend tracking / cost analysis | Session 5 (2026-04-05) | Track grocery spending by category, retailer, month. Interesting for budget-conscious users. Saw in Cooklist. |
| App review prompt timing research | Session 5 (2026-04-05) | Research best practices on when to prompt for app store reviews. Too early = annoying. Needs data-driven timing. |
| Macro tracking extension (future) | Session 5 (2026-04-05) | If we know every meal, we're close to being a food tracker / macro counter. Don't build now (niche risk), but the data will be there. Deferred. |
| Design sophistication as competitive moat | Session 5 (2026-04-05) | The entire competitive set looks amateurish/cheesy/childish. Modern, sophisticated, clean design is a massive differentiator. Not just Griffin's preference — the bar is genuinely low. |

---

## Slotted into V1

| Idea | Source | Notes |
|------|--------|-------|
| Recipe URL import with AI extraction | Griffin brain dump + competitor research | Core V1 feature. Competitors weak here (Samsung Food fails on many sites). |
| AI recipe generation from constraints | Griffin brain dump | Core V1 feature. |
| AI recipe modification with version history | Griffin brain dump | Core V1 feature. Key differentiator — no competitor does versioning well. |
| Weekly meal planner with calendar | Griffin brain dump + competitor research | Core V1 feature. "10-min weekly ritual" north star. |
| AI-assisted "fill my week" | Griffin brain dump | V1 feature. |
| Auto-generated grocery list from meal plan | Griffin brain dump + competitor research | Core V1 feature. Biggest retention lever per research. |
| Intelligent ingredient merging/dedup | Competitor research (NYT Cooking complaints) | Core V1. "Never make users do math." |
| Staples/recurring items list | Griffin brain dump | V1 feature. |
| Grocery list export (clipboard/share) | Griffin brain dump | V1 feature. |
| Household sharing (dual account ownership) | Griffin brain dump, moved from V1.5 (2026-03-29) | Moved to V1 — deep infra implications (auth, data scoping, real-time sync). At least 2-person sharing. |
| Dietary framework selection (preferences) | Griffin brain dump | V1 onboarding. |
| "No list" for foods to avoid | Griffin brain dump | V1 feature. |
| Contextual AI (inline, not chat tab) | UX designer recommendation (Session 1) | V1 interaction model baseline. |

## Slotted into V1.5

| Idea | Source | Notes |
|------|--------|-------|
| Progressive pantry (binary have/don't have) | Griffin brain dump + competitor research | Light mode only. Research: pantry setup friction kills apps. |
| "What can I make?" from pantry | Griffin brain dump | Depends on pantry. |
| Basic expiration awareness | Griffin brain dump | Static shelf-life table, not AI. |

## Slotted into V2

| Idea | Source | Notes |
|------|--------|-------|
| Grocery ordering — Kroger API | Technical research (Session 1) | Only open self-serve cart API. Start here. |
| Grocery ordering — Instacart deep links | Technical research (Session 1) | Pre-filled search URLs, no partnership needed. |
| Photo/screenshot recipe import (Claude Vision) | Griffin brain dump | Depends on vision model quality. |
| Instagram URL recipe extraction | Griffin brain dump | AI-powered extraction from post content. |
| Share-to target for mobile web | Session 1 planning | Let users share from Instagram/Safari directly. |
| Freshness-aware meal sequencing | Griffin brain dump | Perishables early in week, stable meals later. |
| Store layout / aisle mapping | Griffin brain dump + competitor research | User-defined or templates. Plan to Eat praised for this. |
| Schedule awareness (busy nights) | Griffin brain dump | Mark "busy" days, AI adjusts plan complexity. |

## Slotted into V3

| Idea | Source | Notes |
|------|--------|-------|
| Per-recipe nutrition estimates | Griffin brain dump | AI + USDA FoodData Central API. |
| Weekly nutrition summary | Session 1 planning | Depends on nutrition engine. |
| Diet adherence scoring with explanations | Griffin brain dump | "Why flagged" + "what instead." |
| Food warnings on grocery list items | Griffin brain dump | Flag conflicts with dietary preferences. |
| Smart reordering (recurring purchase detection) | Session 1 planning | Detect patterns from grocery list history. |
| Restaurant guidance | Griffin brain dump | AI suggests menu options based on diet. |
| Product research assistant | Griffin brain dump | "Find me a good protein powder." |
| Barcode scanning for pantry | Griffin brain dump | Advanced pantry mode. |
| Receipt photo scanning for pantry | Griffin brain dump | AI extraction from receipt photos. |
| Rough quantity tracking (full/half/almost out) | Session 1 planning | Step up from binary pantry. |

## Slotted into V4

| Idea | Source | Notes |
|------|--------|-------|
| iOS native app (React Native/Expo) | Session 1 planning | Consumes same tRPC API. |
| Push notifications | Session 1 planning | Expiration alerts, "time to plan" reminders. |
| Share extension (import from any app) | Session 1 planning | Critical for recipe capture on mobile. |
| Offline support with local cache | Session 1 planning | SQLite + sync-on-reconnect. |
| Home screen widgets (meal plan, grocery list) | Session 1 planning | iOS/Android. |

## Unphased (Good ideas, not yet assigned)

| Idea | Source | Notes |
|------|--------|-------|
| Cook Mode (step-by-step with timers, voice) | Session 1 brainstorm | Addresses blind spot: actual cooking experience. |
| Leftover Intelligence ("chicken Monday → chicken salad Wednesday") | Session 1 brainstorm | Reduces waste, great AI use case. |
| Seasonal/Local Awareness | Session 1 brainstorm | In-season = fresher, cheaper, tastier. |
| Batch Prep Coaching ("90-min Sunday prep plan") | Session 1 brainstorm | The HOW of meal prep, not just WHAT. |
| Weekly Review Ritual (what did you actually make? thumbs up/down) | Session 1 brainstorm | Feeds recommendation engine. Critical for AI improvement. |
| Cost Estimation (grocery list price estimates) | Session 1 brainstorm | Budget-conscious users. Research: cost is a real driver. |
| Family Member Profiles (per-person preferences) | Session 1 brainstorm | Conflict navigation ("partner dairy-free, you love cheese"). |
| "Quick Win" Suggestions (tonight's dinner from pantry + expiring) | Session 1 brainstorm | The "staring at fridge" moment. |
| Cooking Skill Progression (track techniques, push comfort zone) | Session 1 brainstorm | Light gamification with purpose. |
| Collaborative Meal Planning (dinner parties, potlucks) | Session 1 brainstorm | "I'm bringing main, you bring sides." |
| Multimodal food evaluation (photo → dietary assessment) | Griffin brain dump | Take photo, AI evaluates against diet. |
| Baby mode onboarding (chat + fixed UI combo) | Griffin brain dump | Dynamic onboarding approach. |
| Metabolic health food lookup ("is this food good for me?") | Griffin brain dump | Standalone utility within the app. |
| Help finding healthier restaurants | Griffin brain dump | Extension of restaurant guidance. |

## Explicitly Deprioritized

| Idea | Reason | Date |
|------|--------|------|
| LLM fine-tuning / custom model | Claude/GPT structured output handles recipe tasks well. Revisit only if quality insufficient. | 2026-03-28 |
| Full quantitative pantry (gram-level) | Too much friction. Binary or rough estimates only. Research validates this. | 2026-03-28 |
| Loyalty card API integration | Brittle, retailer-specific. Cooklist's experience shows trust damage when it fails. | 2026-03-28 |

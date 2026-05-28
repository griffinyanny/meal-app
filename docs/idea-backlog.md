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

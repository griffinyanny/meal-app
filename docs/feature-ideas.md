# Feature Ideas Catalog - Meal Management App

All feature ideas with current status and target phase. Updated as ideas are added, refined, or deprioritized.

---

## V1 Features (Confirmed)

### Recipe Library
- [ ] Manual recipe creation (structured form)
- [ ] URL import with AI-powered extraction (Claude parses HTML into structured fields)
- [ ] AI recipe generation ("30-min chicken dinner, Good Energy friendly")
- [ ] AI recipe modification ("swap pasta for rice, keep the vibe") — creates new version, original preserved
- [ ] Recipe search and browse
- [ ] Favorites and tags
- [ ] Recipe version history

### Meal Planning
- [ ] Weekly calendar view (7 days, breakfast/lunch/dinner/snack slots)
- [ ] Drag recipes from library into slots
- [ ] AI-assisted "Fill my week" based on preferences, time, variety
- [ ] "Leftover" and "eating out" slot markers
- [ ] Serving size per slot

### Grocery List
- [ ] Auto-generated from meal plan
- [ ] Intelligent ingredient merging (quantity + unit normalization via AI)
- [ ] Manual add/remove/edit
- [ ] Check-off interface for in-store use
- [ ] Category grouping (produce, dairy, meat, pantry, frozen)
- [ ] "Staples" list (recurring items that auto-populate weekly)
- [ ] Export to clipboard (plain text)

### Preferences & Onboarding
- [ ] Dietary framework selection (keto, paleo, vegetarian, Good Energy, custom, none)
- [ ] "No list": foods to always avoid
- [ ] Household size
- [ ] Cooking time preferences (weeknight max, weekend max)
- [ ] Cuisine preferences

### AI (Contextual)
- [ ] Inline AI actions on recipe cards, meal plan, grocery list
- [ ] Structured outputs (recipe cards to save, plan changes to confirm)
- [ ] General-purpose chat for open-ended questions

---

## V1.5 Features (Planned)

### Progressive Pantry (Light Mode)
- [ ] Staples checklist (common items marked "I keep this stocked")
- [ ] Auto-subtract stocked items from grocery lists
- [ ] "I bought this" flow when checking off grocery items
- [ ] "I'm out" swipe gesture -> adds to next list
- [ ] Binary only: have it / don't have it (no quantities)

### "What Can I Make?"
- [ ] Surface recipes where user has most ingredients
- [ ] "Missing N ingredients" badges on recipes
- [ ] AI: "What can I make with what I have?"

### Basic Expiration Awareness
- [ ] Default shelf-life estimates for perishables (static lookup table)
- [ ] "Use soon" badges
- [ ] Push notification for approaching expiration

### Household Sharing
- [ ] Invite members via email
- [ ] Shared recipe library, meal plan, grocery list, pantry
- [ ] Real-time sync via Supabase Realtime

---

## V2 Features (Planned)

- [ ] Grocery ordering integration (Instacart first) with match confidence and fallbacks
- [ ] Photo/screenshot recipe import via Claude Vision
- [ ] Instagram URL recipe extraction
- [ ] Share-to target for mobile web
- [ ] Freshness-aware meal sequencing (perishables early in week)
- [ ] Store layout / aisle mapping (user-defined or templates)

---

## V3 Features (Planned)

- [ ] Per-recipe nutrition estimates (AI + USDA FoodData Central)
- [ ] Weekly nutrition summary
- [ ] Diet adherence scoring with explanations
- [ ] Food warnings on grocery list items conflicting with preferences
- [ ] Smart reordering (detect recurring purchase patterns)
- [ ] Restaurant guidance (AI suggests menu options based on diet)
- [ ] Product research assistant (protein powders, etc.)
- [ ] Barcode scanning for pantry
- [ ] Receipt photo scanning for pantry
- [ ] Rough quantity tracking ("full," "half," "almost out")

---

## V4 Features (Planned)

- [ ] iOS native app (React Native/Expo)
- [ ] Push notifications
- [ ] Share extension (share from any app into recipe import)
- [ ] Camera integration for barcode/receipt scanning
- [ ] Offline support with local cache
- [ ] Home screen widgets (meal plan, grocery list)
- [ ] Android app (same React Native codebase)

---

## Unphased Ideas (Generated, needs prioritization)

These ideas surfaced during Session 1 brainstorming. Not yet assigned to a phase.

- [ ] **Cook Mode** — Step-by-step cooking view with built-in timers, keep-screen-on, voice control ("next step"). Addresses the actual cooking experience.
- [ ] **Leftover Intelligence** — "You made roasted chicken Monday. Here's chicken salad for Wednesday using the leftovers." Reduces waste and mental load.
- [ ] **Seasonal/Local Awareness** — AI knows what's in season in your region, suggests recipes accordingly.
- [ ] **Batch Prep Coaching** — "Sunday prep: roast all veggies while grains cook. Here's your 90-minute plan." The HOW of meal prep, not just WHAT.
- [ ] **Weekly Review Ritual** — End-of-week: what did you actually make? Thumbs up/down. Feeds recommendation engine. Creates feedback loop.
- [ ] **Cost Estimation** — Rough grocery list cost estimates based on regional pricing.
- [ ] **Family Member Profiles** — Per-person preferences/restrictions. AI navigates conflicts ("partner is dairy-free but you love cheese").
- [ ] **"Quick Win" Suggestions** — Based on pantry + expiring items + time, proactively suggest tonight's dinner. The "staring at the fridge" moment.
- [ ] **Cooking Skill Progression** — Track techniques/cuisines tried, gently push comfort zone. Light gamification.
- [ ] **Collaborative Meal Planning** — Planning meals with friends for dinner parties or potlucks. "I'm bringing the main, you bring sides."
- [ ] **Multimodal food evaluation** — Take a photo of a food/dish, AI tells you if it fits your dietary framework and suggests alternatives
- [ ] **Food "no list" warnings** — If user takes a photo or describes a dish, flag potential issues (e.g., pasta as refined grain)
- [ ] **Baby mode onboarding** — Dynamic onboarding that's a combo of chat + fixed UI (or chat-only to start)

---

## Explicitly Deprioritized / Parked

- LLM fine-tuning / custom model — Not needed. Claude structured output handles recipe parsing, modification, and chat well. Revisit only if quality is insufficient.
- Full quantitative pantry (gram-level tracking) — Too much friction. Binary or rough estimates only.
- Loyalty card API integration — Brittle, retailer-specific, and Cooklist's experience shows it breaks trust when it fails.

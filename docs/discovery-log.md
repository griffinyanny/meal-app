# Discovery Log - Meal Management App

This is the running log of everything Griffin shares during Phase 0 discovery: opinions on competitor apps, UX preferences, interaction patterns he likes or dislikes, and insights from exploring the problem space. This builds up into a "taste profile" that shapes the product.

---

## Competitive Preferences

### Apps Discussed

#### NYT Cooking (Session 4, 2026-03-30)
**What it is**: Primarily an inspiration/discovery/recipe platform. Not the app Griffin wants to build — different job. But has strong UX patterns worth studying.

**What Griffin likes:**
- **Recently viewed row at the top of home page** — Griffin uses this constantly. When meal prepping, he looks at a recipe and comes back to it via this row. Having recent recipes super easily accessible is critical. They even use a tab for this now (possibly new), which is an interesting organizational choice.
- **Recipe box (saved recipes)** — Detailed, well-organized. Raises IA question: how prominent should the recipe library be in our app? Own tab, or nested in a profile/settings area?
- **Search with categories/attributes/series** — Not just a bare search bar. They show browseable categories, series, and attributes that help with inspiration without requiring you to know what you're searching for. Good for discovery.
- **Curated editorial content / carousels** — "In season near you," "Rice is nice," themed collections. Beautiful product photography. This is where NYT shines — they editorialize well.
- **Images are critical** — Griffin personally finds recipes WITHOUT images far less compelling. Much less likely to click on a text-only recipe. Wonders if other users share this sentiment. (Note: research strongly suggests yes — images are one of the highest-engagement drivers in recipe apps.)

**What Griffin is uncertain about / tensions raised:**
- **Discovery model: curated browse vs. AI-first?** NYT does editorial carousels well. Do we want that browse/stumble-upon experience, or do we go strict AI-first? Probably some browse, but how much?
- **Search model: category catalog vs. AI-driven?** NYT's search page with categories is great for inspiration. But our app is AI-native — do we have a traditional category search at all, or is it all conversational?
- **Recipe library placement in IA** — Does the recipe box warrant its own tab, or does it live in a profile/other section? Is browsing saved recipes the same "job" as discovering new ones, or different?
- **Image quality as competitive moat** — NYT has a massive professional photography backlog. Can a one-person operation compete on visual quality? This is a real gap to address.

**What's NOT relevant to our app:**
- NYT's editorial model (staff writers, curated collections) — we can't replicate this at scale
- Their business model (recipes as content driving subscriptions) — different from ours

### UX Patterns Griffin Likes
- **Recently viewed row** at top of home page (NYT Cooking) — critical for meal prep workflow
- **Browseable search** with categories, attributes, series — not just a bare search bar (NYT Cooking)
- **Curated editorial content / carousels** — themed collections, beautiful photography (NYT Cooking)
- **Voice dictation as primary input** — Cooklist's approach of "just dump your ideas verbally" is the right instinct, even if execution needs work (Cooklist)
- **Conversational meal planning entry** — "Tell me what you want to eat this week" is exactly the interaction model we want (Cooklist)
- **"Thinking" animations** with descriptive spinner text (brainstorming dinners, matching items, etc.) — a known pattern from ChatGPT/Claude but important to implement well (Cooklist)
- **Ingredient reuse optimization** — planning meals that share ingredients (tortillas, eggs) to reduce cost. Smart and practical (Cooklist)
- **Recipe action menus** — contextual actions on recipes: record cooked, add to shopping list, add to plan, remix, save to collection (Cooklist)
- **Ingredient detail pages** — click an ingredient to see related recipes and related products. Super interesting cross-referencing (Cooklist)
- **In-app guided tours** with on-screen highlight overlays — helps users discover features they'd never find (Cooklist)
- **Force-touch / press-and-hold** contextual actions on recipe cards (save, shop, plan) — efficient gesture-based shortcuts (Cooklist)
- **"Cook Now" filter** — what can I cook with what I have right now? Interesting discovery mechanism (Cooklist)
- **Multiple recipe import modalities** — scan recipe, import from web, write new, create collection (Cooklist)
- **Plan history** — past plans for historical reference (Cooklist)
- **Spending analysis** — seeing grocery spend breakdown by category (Cooklist, though execution is rough)
- **"Scan your fridge"** — take a photo, AI figures out what's in your pantry (Cooklist)

### UX Patterns Griffin Dislikes
- **"Cheesy" / amateurish UI aesthetic** — fonts, graphics, celebration animations, logo design. The entire competitive set looks childish/playful in a way that feels low-quality. HUGE opportunity to differentiate on pure design sophistication (Cooklist — and most competitors broadly)
- **Dark mode with inconsistent white bottom bar** — basic visual polish issues (Cooklist)
- **Forced pantry setup on first use** — caused Griffin to literally bounce from the app. Anti-pattern. (Cooklist)
- **Hard-coded plan structure** — each plan is a distinct artifact with its own settings (diet, people, dates). Should be dynamic and system-level knowledge. (Cooklist)
- **No confirmation after voice input** — Cooklist takes voice input and just processes it without showing what it heard or asking clarifying questions. Huge miss. (Cooklist)
- **4-minute plan generation time** — unacceptably slow. Needs background processing with clear progress indicator across app. (Cooklist)
- **Manual "sync to shopping list" step** — plan changes should auto-flow to shopping list, not require an explicit sync button. Why does this step exist? (Cooklist)
- **Not landing on shopping list after sync** — requires navigating to a different tab. Breaks flow. (Cooklist)
- **Per-plan settings that should be global** — diet, number of people, etc. being set per plan instead of being system-level knowledge. Represents old artifact-based thinking. (Cooklist)
- **Cheesy emoji-heavy UI elements** — celebration graphics, food emojis in modals, childish graphics. (Cooklist)
- **Slow image loading / latency throughout** — recipe images take too long. (Cooklist)
- **Web view for retailer checkout** — functional but clunky. Email code auth within shopping flow is friction. (Cooklist)
- **Too-early app review prompt** — "Are you enjoying Cooklist?" appears before user has even completed first meaningful action. (Cooklist)
- **Too many tabs / too spread out** — Plan, Shop, Pantry, Cook, Profile all as separate tabs. Do you need all of these? Why can't this be more fluid? (Cooklist)
- **"Power button" toggle for Cook Now filtering** — awkward UI for what should be a natural query to AI (Cooklist)

#### Cooklist (Session 5, 2026-04-05)
**What it is**: Pantry-first meal management app. Connects to grocery loyalty cards, imports purchases into digital pantry, matches recipes to what's on hand, generates missing-items-only shopping lists. Has AI-powered meal plan generation via voice input. Integrates with Target, Walmart, Kroger for checkout. Probably the closest competitor to what Griffin wants to build.

**Griffin's summary framing**: "What I'm doing is building an AI-first Cooklist." The overall flow is similar — describe what you want → AI generates plan → sync to shopping list → checkout at retailer. But every aspect of the execution has room for dramatic improvement.

**What Griffin likes:**
- **Voice dictation as a primary input mechanism** — The instinct of "just dump your ideas verbally" is exactly right. They prompt "tell me what you want to eat this week and talk about your upcoming week, and we'll create a comprehensive grocery plan." This conversational entry point is the interaction model we want.
- **AI-generated suggestion pills** — Inspiration prompts with AI badges that help users think about what they want. Good for people who don't know where to start.
- **Ingredient reuse optimization** — "Mix and match" planning: if you're buying tortillas, use them in multiple meals. If you're buying eggs, plan eggs multiple ways. Optimizes for cost savings. Smart.
- **Recipe action menu** — From a recipe you can: record cooked, add to shopping list, add to meal plan, save to collection, remix and edit, share, print, view source website. Comprehensive set of actions.
- **Ingredient detail pages** — Click on an ingredient (e.g., Rolled Oats) and see: related recipes (Apple Crisp Cake, Nutty Granola), related products (Bob's Red Mill, Wegmans). Cross-referencing between ingredients, recipes, and products is a super interesting concept.
- **"Scan your fridge"** — Take a photo, AI figures out what's in your pantry. Obviously we want this.
- **Barcode scanner** for pantry import and store receipt scanning. Multiple input methods.
- **In-app guided tour** with screen highlight overlays — "Press and hold on a recipe to Save, Shop, or Plan." Good for progressive feature discovery.
- **Force-touch contextual actions** — Press and hold on recipe card, radial menu appears (bookmark, cart, plan). Efficient.
- **"Cook Now" toggle** — Filter recipes to show only ones you can cook with current pantry ingredients. Interesting discovery mechanism.
- **Past plans for historical reference** — Can look back at previous plans.
- **Spending analysis** — Pie chart breakdown of grocery spend by category. Interesting, though execution is rough.
- **Shopping list multiple input modalities** — Write a list item, past purchases, saved products, browse the grocery store, scan a product barcode. Comprehensive.

**What Griffin dislikes:**
- **UI aesthetic is the #1 problem** — "Cheesy" is the recurring word. Fonts, graphics, celebration animations, emojis in modals, the logo itself — all feel amateurish and childish. Dark mode with a white bottom bar. Slow-loading images. This is across the entire competitive set, not just Cooklist, but Cooklist is a particularly stark example. Griffin sees enormous opportunity to win purely on design sophistication.
- **Forced pantry setup on first launch** — This literally caused Griffin to bounce from the app initially. Their main value prop (pantry tracking) requires a huge upfront investment that most users won't make. Validates our "progressive pantry" approach.
- **Hard-coded plan artifacts** — Each plan is a distinct object with its own settings (diet, number of people, start date, author note). This represents old thinking. Plans should be dynamic and continuous — the system knows your diet, your household size, etc. You shouldn't re-specify these per plan.
- **No feedback loop after voice input** — You speak, they show a "thinking" animation, and then present a plan. They never show what they heard, never ask clarifying questions, never let you confirm intent. "That's a huge miss."
- **4-minute generation time** — Plan generation took up to 4 minutes. So slow that Griffin left to browse other parts of the app. Need background processing with app-wide progress indicator.
- **Manual sync step from plan to shopping list** — After creating a plan, you have to explicitly click "Sync with shopping list," then select items, then confirm. This should just happen automatically. Why does this step exist?
- **Per-plan metadata that should be system knowledge** — Diet selection, number of people — these should be persistent user preferences, not settings you configure per plan.
- **Web view for retailer checkout** — Clicking "Transfer to Target" opens a web view where you have to log in (email + code), then transfer items, then you're in Target's checkout. Functional but very clunky. Can we do single sign-on or pre-authenticate?
- **Too many tabs (IA sprawl)** — Plan, Shop, Pantry, Cook, Profile. Five tabs, each with deep feature sets. Feels spread out. "Do I need all these tabs? Do I need a page that shows me my pantry? Am I going to spend all this time actively managing my pantry?"
- **Early app review prompt** — "Are you enjoying Cooklist?" appeared before Griffin had completed meaningful usage.
- **Images load slowly** — Latency throughout the app makes it feel sluggish.
- **Cheesy celebration graphics** — After saving a plan, animated confetti/celebration screen. "Super amateurish."

**Key tensions / questions Cooklist raises:**
- **Recipe discovery model**: Cooklist has an infinite scroll recipe catalog. Griffin questions whether this is what people want. "Do I just lean into AI-generated recipes and not have this robust catalog? Can people do their recipe discovery elsewhere and bring it into our app? Do people want to browse 100 steak recipes, or do they want recommendations based on what they're feeling?" This is a fundamental product question.
- **Pantry as a tab vs. embedded capability**: Cooklist dedicates an entire tab to Pantry. Is that necessary? Or should pantry be an invisible background capability that informs the AI without requiring its own dedicated section?
- **Retailer authentication timing**: Should store accounts be linked during initial setup (reducing friction at checkout) or at checkout time (simpler onboarding)? Cooklist does it at checkout, which is clunky.
- **How does recipe aggregation work technically?** Cooklist has a massive recipe catalog — is this scraping, feeds, partnerships? If it's feeds, we could do the same.
- **Macro tracking as a future extension**: If you know every meal someone is eating, you're close to being a food/fitness tracker. Griffin explicitly flags this for later — doesn't want to niche down to clean-eaters, but the data is there.

**Screenshots reference** (saved to `reference/competitor-videos/Cooklist/`):
- IMG_4307, IMG_4311: Plan generation with "thinking" animation, brainstorming phases, planned meals overview
- IMG_4316: Ingredient list with AI-generated descriptions and "Request edits" / "Add to meal plan" CTAs
- IMG_4317: "Customize Your Plan" onboarding modal with emoji graphics (example of cheesy design)
- IMG_4319-4320: Plan detail view (light mode) — meal items with descriptions, servings, calories, schedule days
- IMG_4322: "Add to Shopping List" modal — 57 missing ingredients with quantities
- IMG_4325: Recipe detail with servings, schedule selector, and Remove/Details buttons
- IMG_4331: Recipe detail page with "Are you enjoying Cooklist?" rating prompt overlay
- IMG_4332: Recipe action menu (record cooked, add to shopping list, add to plan, save, remix, share, print, view source)
- IMG_4336: Plan metadata (nutrition summary — paid feature), quote/notes section
- IMG_4337: Cook tab with "Pantry to Recipes" tour prompt, recipe cards with filter pills
- IMG_4339: Screen recording of Cook tab showing recipe browse with "Press and hold" tour
- IMG_4340-4341: Force-touch radial menu on recipe card (save, shop, plan icons)
- IMG_4346: Product browsing within retailer (Target at Woodinville) — images failing to load
- IMG_4355: "Import your pantry" setup with barcode scanner CTA
- IMG_4356: "Setup Your Cooklist" checklist — order groceries, try pro, turn on expiration notifications, invite fridgemates
- IMG_4358: Ingredient detail page (Rolled Oats) — related recipes and related products
- IMG_4360: Past Plans view (empty state)
- IMG_4361: Shopping list bottom with spending analysis pie chart and "Connect My Stores" CTA
- IMG_4362: "Add To Shopping List" modal — write item, past purchases, saved products, browse store, scan barcode

### Mela (Session 5, 2026-04-05) — DESIGN REFERENCE, not competitor
**What it is**: Minimalist recipe manager. Power-user tool for storing/organizing recipes. Not an "AI help me" app — it's all manual. Recipes, Feeds, Browser, Calendar, Groceries tabs.

**What Griffin likes (design only):**
- **One bold primary color (yellow) on dark background** — simple, striking, sophisticated
- **Minimalist layout** — huge amounts of whitespace, bold serif headers ("Groceries", "Feeds", "Calendar"), zero clutter
- **Confidence in simplicity** — empty states are just clean dark screens with a header, not busy UX noise
- **Visual design feels premium** despite being functionally basic

**What Griffin does NOT want to emulate:**
- The functionality — it's entirely manual, no AI, user does all the work
- The "bring your own recipes" model — no intelligence, just a vault

**Takeaway**: Mela proves you can make a recipe app look premium with very simple design choices. One accent color + dark mode + bold typography + whitespace = sophisticated.

**Screenshots**: `reference/competitor-videos/Mela/` — MelaPlus paywall (yellow), Calendar (clean date list), Groceries (minimal input), Feeds (empty state)

### Non-Food App Inspiration

#### Function Health (Session 1, Session 5 — 2026-04-05)
**What it is**: Health testing/biomarker platform. Not a food app — relevant for interaction model and visual design.

**What Griffin likes:**
- **Flat visual design with interesting graphics** — the striped orb logo, dark/green color scheme, clean cards
- **The "static UI → AI chat" transition model** — Protocols tab shows structured protocol templates, but when you click "Create Protocol," it drops you into the AI chat view to actually build it. The AI chat is where the real work happens. This is an interesting hybrid that maps to our "AI generates the UI" model.
- **AI chat with structured objects inline** — not just text responses, but actual UI elements (protocol builder, progress steps) blended into the chat. "Building your Whole body Protocol: Reviewing your data → Applying your preferences → Referencing materials → Creating your Protocol." This is exactly what our AI interaction should feel like.
- **Suggestion pills in chat** — "Create a heavy metal detox plan", "Support autophagy and mTOR", etc. Pre-loaded contextual prompts.
- **The personalized welcome** — "Long live Griffin." Small touch, big feel.

**What Griffin likes less:**
- More stat-driven than a cooking app would be — the visual style is functional but clinical
- Would be acceptable as a baseline but aspires to something more visually rich

**Takeaway**: The Protocol creation flow (static templates → AI chat → structured output with progress steps) is the closest existing pattern to our "AI generates the UI" interaction model. Study this flow carefully for V1 design.

**Screenshots**: `reference/competitor-videos/Function Health/` — Splash, "Long live Griffin" loading, Home (Biological Age card), Chat (suggestion pills), Chat (thinking), Chat (building protocol with progress steps), Protocol templates, Clinician Notes / Action Plan cards

#### Robinhood (Session 5, 2026-04-05)
**What it is**: Trading/investing app. Not a food app — relevant for visual design and IA.

**What Griffin likes:**
- **Illustrations that look like wireframes/specs** — simple, diagrammy line art (interlocking circles on onboarding, geometric bar charts for Strategies). Not photographic, not cartoonish. A distinctive illustration style that feels technical and sophisticated.
- **Bold colors on black background** — neon green CTAs, orange accents, gold 3D renders. High contrast. Limited palette per screen.
- **Big images for complex topics** — the 3D gold checkmark for credit card waitlist, the 3D bar chart ring for Strategies. These are hero images that communicate the product's premium feel.
- **Four tabs with deep content** — Home, Compass, Search, Profile. Simple IA with lots of depth per section. Good model for keeping tab count low while supporting rich functionality.
- **Information density done right** — crypto movers pills, earnings data, sports scores — lots of data on screen but it never feels cluttered because the typography hierarchy is strong.

**Takeaway**: Robinhood proves you can show dense, complex information while feeling premium. The key is typography hierarchy + limited color palette + distinctive illustration style. The 4-tab IA model is directly relevant to our app structure. The illustration style (geometric, diagrammy, technical) could translate to meal planning as ingredient/cooking illustrations.

**Screenshots**: `reference/competitor-videos/Robinhood/` — Onboarding (circle illustration), Crypto page (3D abstract), Login, Home (dense info), Strategies (3D ring chart), Crypto (line art illustration), Explore, Credit card (gold 3D checkmark), Wallet

#### Flighty (Session 5, 2026-04-05) — TOP DESIGN REFERENCE
**What it is**: Flight tracking app. Not a food app — relevant as a top-tier design reference.

**What Griffin likes:**
- **iOS Liquid Glass fully embraced** — translucent panels, glass-morphism cards, depth layering. Flighty leans into the latest iOS design language harder than almost any app. This is the aesthetic Griffin wants.
- **The bottom card modality** — a persistent card that pulls up from the bottom, always on screen, layered over the map. This "card over content" pattern could be perfect for AI chat over the meal plan, or cooking mode over recipe detail.
- **Rich, serious, dense BUT airy and usable** — this is Griffin's exact description of the target feel. Data-rich (flight stats, delay forecasts, aircraft details) but never cluttered.
- **Beautiful illustrations** — detailed aircraft renders (Delta A321neo, Alaska 737 MAX). Not clipart — premium, photorealistic-ish illustrations that feel like collectibles.
- **Purple/blue accent palette on dark background** — sophisticated, not playful.
- **Dense data presentation** — flight passport stats (flights, distance, airports), delay probability bars, route history. Complex information made beautiful.
- **The "map + card" layout** — full-bleed globe map as background with interactive card overlay. The background IS the content; the card IS the interaction layer.

**What's not transferable:**
- The map view (no equivalent in a meal app)
- Aircraft illustrations (though food/ingredient illustrations could serve a similar "delight" role)

**Key design principle extracted**: "Rich, serious, dense, but also really airy and usable at the same time." This IS the design brief.

**Screenshots**: `reference/competitor-videos/Flighty/` — Pro paywall (purple gradient), My Flights (globe + card), Flight log (passport stats, aircraft render), Flight detail (map + route), Flight detail (delay forecast), Flight detail (airline info, route history), Edit flight record (form), Airports (globe + bottom card)

#### Crouton (Session 5, 2026-04-05) — #1 DESIGN REFERENCE / MVP BASELINE
**What it is**: Recipe manager with cook mode. THIS IS THE CLOSEST EXISTING APP TO THE VISUAL DIRECTION GRIFFIN WANTS, applied to the food domain.

**What Griffin likes:**
- **Liquid Glass aesthetic applied to recipes** — dark mode, translucent cards, iOS-native feel. Looks like Flighty's design language adapted for cooking. This is the specific intersection Griffin wants: Flighty's visual sophistication + food domain.
- **Cook mode is exceptional** — step-by-step view with large text, swipe navigation (forward/back arrows), waving hand icon. Clean, focused, distraction-free. Ingredients highlighted as tappable blue links within step text. Timer detection ("bake for 10-12 minutes") auto-generates a "Start Timer" pill. Timer UI is beautiful (blue circular buttons, clean number pad).
- **Smart inline features** — "10-12 minutes" in recipe text is highlighted orange and tappable → opens timer. Ingredient names in steps are highlighted blue and tappable → presumably shows quantity/detail. This "smart text" approach is brilliant — the recipe IS the interface.
- **Scaling UX** — slider + multiplier (×2) with tabs for "amount", "serving", "ingredient" views. Simple, fast, tactile. Scale badge persists ("Scale: x 2") so you always know.
- **Add to Groceries flow** — clean checklist with blue checkmarks, red X to exclude, "Deselect All" / "Add 9 Items" CTAs. Already scaled to current multiplier. Simple and functional.
- **Recipe detail page** — hero image, "Start" button with play icon, servings, prep time, ingredients list, method with numbered steps. Clean layout, no clutter.
- **Meal Plan view** — weekly calendar, each day expandable, "+" to add. Popup menu: Recipe, Note, Random Recipe, Section. Clean glass-style cards.
- **Export options** — Link, File, PDF, Plain Text, Markdown. Power-user friendly.
- **Tab bar** — 5 tabs: Meal Plan, Recipes, Groceries, Discover, Settings. Clean icons.
- **"Groceries: Added 9 Items" toast notification** — subtle, informative, non-intrusive confirmation.

**What Crouton is NOT:**
- It's not AI-powered — everything is manual. No plan generation, no voice input, no personalization, no "AI generates the UI." It's a beautiful vault + cook tool.
- This is the critical gap: take Crouton's design and add our AI-first interaction model.

**Griffin's framing**: "If you asked me to pick one single app that I want to emulate, I'd say Crouton with Flighty, kind of like that combo." And: "If you wanted to start with one place, let's just rip off the exact Crouton visual design... with an AI version view. I think Crouton is an excellent example of what my MVP could look like."

**Screenshots**: `reference/competitor-videos/Crouton/` — Recipe detail (Chocolate Chip Cookies hero image, ingredients, method), Method steps (numbered, ingredient links highlighted blue), Cook mode (step-by-step, large text, swipe navigation), Cook mode (timer detection - "Start Timer" pill on "10-12 minutes"), Cook mode (ingredients panel at bottom), Timer UI (blue number pad), Scaling (slider + x2 multiplier), Add to Groceries (checklist), Meal Plan (weekly calendar with popup menu), Recipe export options (Link/File/PDF/Text/Markdown), Toast notification ("Groceries: Added 9 Items")

---

## Interaction Model Preferences
- Contextual AI everywhere as baseline (decided Session 1)
- Open question: what happens when you engage with the AI — chat thread vs. wizard vs. hybrid
- Griffin wants to think outside the box on AI interaction, not just replicate ChatGPT
- The editing experience (recipe modification, plan changes) is the key design question

### AI Input Surface Preferences (Session 8, 2026-05-26)

**Free-form input must be first-class, not a fallback:**
- Griffin demonstrated that dictating complex, multi-constraint requests ("4 recipes, no repeats, grill 3, 3 proteins, baby-friendly") takes 30 seconds vs. potentially many card swipes
- This is not a power-user edge case — dinner parties, weekly themes, specific ingredient use, lifestyle constraints are common real-world scenarios
- The input surface should be visible and easily discoverable, not buried behind taps

**AI should acknowledge and explain, not be silent:**
- When the user gives input, the AI should confirm it was heard and explain what it did: "Built for your Saturday dinner party — 6 guests, grilling focus, baby-friendly sides"
- This acknowledgment is one of the genuinely valuable traits of ChatGPT/Claude experiences — don't discard it
- It should be brief and woven into the UI (plan headers, card rationale), not a separate chat response
- The AI's personality showing through the output makes it feel generative and alive

**Multi-turn is okay, but through structured options, not chat:**
- Clarification should happen through tappable option cards ("chicken or steak?" as cards to tap) not text questions ("What protein would you prefer?")
- The AI does the cognitive work of narrowing options — user just picks
- Can go 2-3 rounds for complex requests without feeling like a chat thread
- Griffin's example: "You told me dinner party → here's a few direction options as cards, approve or modify"

**"Talk to the Chef" as the named input affordance:**
- Griffin likes having a clearly labeled, always-discoverable free-form input point
- "Talk to the Chef" works as a working label — aligns with the personal chef metaphor
- Should be visible without hunting — Griffin is concerned about hiding the input behind too many layers
- Acknowledged it might be "too on the nose" for final product — naming is a future refinement

**Don't over-correct away from conversational AI:**
- "Those tools have a billion people using them" — ChatGPT/Claude interaction patterns are popular for a reason
- Take the best parts (acknowledgment, personality, multi-turn intelligence) while rejecting the worst (blank prompt boxes, long text threads, generic sparkle buttons)
- The goal is a better container for the same intelligence, not eliminating conversational AI entirely

---

## Problem Space Insights

### Grocery List Experience (Session 2, 2026-03-29)
- **Free-form vs. catalog tension**: Do people want to just jot things down freely, or pick from a structured catalog? Catalog helps with normalization/merging but adds friction. Dual mode feels like odd CX. Needs a solve that's fast AND structured.
- **This is your FULL store list, not just food**: Must capture household items (paper towels, cleaning supplies, etc.), not just recipe ingredients. It's the complete shopping trip.
- **Check-off + online ordering mapping**: Lists need to work for both in-store check-off and mapping to online ordering seamlessly.
- **Weights and quantities must be intuitive**: Don't make people think about units. Smart defaults.
- **Custom store layout is important to people**: Could capture store path with AI ("tell me how your store is laid out" or learn from check-off order over time).
- **Reduce manual edits over time**: Learn preferences so the list gets better each week without user effort.
- **Handwritten list scanning**: Could augment meal planning — scan a handwritten list and integrate it into the system.

### AI Interaction & Discovery (Session 2, 2026-03-29)
- **Show examples of how to ask**: Users need to see what's possible. Like "I want to grill this week, let's jam on some ideas." The AI is a search and discovery partner, not just a command executor.
- **Auto-generated refinement pills**: Have dynamically updating suggestion chips (e.g., "healthy" → "dinner" → "grill" → "fast" → "chicken") that narrow results progressively. Continuously refine based on context.
- **Substitution UX**: Need a smart solve for substituting ingredients. Could use intelligent related items, or invoke AI for context-aware swaps instead of a static carousel.
- **Capture most intent with AI as a core tenet**: Instead of building static settings UIs for everything, let people SAY what they want and have it happen. Preferences could be recalled and edited through AI vs. building static preference screens. Would need to train users on this, but we're moving toward a world where people just want to say a thing and it happens rather than poke around trying to find settings.
- **Avoid the ChatGPT ripoff feel**: The AI interaction model needs to NOT feel like just a chat window. How do we make it distinctly useful for this domain without being too rigid or too generic?
- **Remember preferred brands**: After ordering through a merchant, learn brand preferences (e.g., what brand and type of milk). This builds intelligence over time without asking.

### Planning Flexibility (Session 2, 2026-03-29)
- **Do NOT fall into the linear golden path trap**: Planning must be flexible. Users should be able to come back and iterate easily at any point. Long rigid flows are probably worse than open-ended flexible ones.
- **Handle ALL types of meal occasions, not just weekly prep**: "I'm having people over — help me come up with ideas, things that pair well, a full meal schedule with recipes." Dinner parties, potlucks, hosting, special occasions — the full spectrum from inspiration → recipes → shopping list → cooking.
- **Learning without making it cumbersome**: How do we learn what people actually buy and prefer without creating tedious onboarding or tracking flows?

### Memory as a Core Feature (Session 2, 2026-03-29)
- **Memory is absolutely critical.** The system needs to track, save, and manage user context over time. Every interaction is an opportunity to learn.
- When the AI captures a preference, it should confirm: "Saved" or "Got it, I'll remember that." Users need to feel that things stick.
- There should be a structured audit view (dietary preferences section, favorite brands section, etc.) — but the HOPE is users rarely need to go there. Ideally they feel comfortable enough to just chat: "I didn't like that brand last week, exclude it."
- Even indirect signals should be captured: "I didn't like that brand last week" → system infers to default to a different brand in the future. Always problem-solving, remembering, personalizing.
- We need to figure out the infrastructure for this: how are we tracking, saving, and managing all this context? This is a product-defining capability.

### AI-First Interaction Model — Deeper Thinking (Session 2, 2026-03-29)
- **AI-first preferences confirmed**: AI is the input, structured view is the audit layer. Users say things naturally, system learns. Structured preferences screen exists for verification but shouldn't be the primary editing surface.
- **Entry points refine intent**: When users enter from "Recipes," they probably want to add/find a recipe. From "Meal Plan," they want to plan. The app should deeply understand their intent from context and guide them toward it.
- **Chat as the primary interaction form factor**: Griffin leans toward chat as the core interaction model, at least for V1. It might be the easiest form factor to start with AND what people are starting to expect. A dynamic wizard flow with static screens could feel like it obfuscates the steps — people might prefer free-form conversation.
- **BUT not just plain chat**: Should incorporate dynamic UI elements, illustration, motion. Not a ChatGPT clone — a domain-specific conversational experience with rich visual elements inline.
- **Dictation/voice-first as an emphasis**: Not AI voice mode (different model), but using dictation so people don't have to type everything. This is a forward-facing interaction pattern.

### AI-Guided Onboarding — The "AI Interview" Insight (Session 2, 2026-03-29)
**Key insight from Griffin's Zillow experience**: When Zillow introduced an AI-first onboarding flow (AI asks questions conversationally instead of static form screens), they got:
- Significantly higher conversion through the flow
- Immensely more data points about user intent than explicit form fields could capture
- The format was specifically an "AI interview" style

**Application to this app**:
- Onboarding could be an AI-guided conversation: "How many meals are you planning this week?" → "Three" → "Great, what are you in the mood for?" etc.
- Let the user know upfront: "I'm going to walk through a few questions, ready?"
- User is always in control — can free-form, redirect, skip
- System maintains state: if they only planned 2 of 3 meals, it remembers and prompts later ("Should we plan a few more meals? You liked that recipe from two weeks ago — want to bring it back?")
- Continuously provides useful suggestions based on maintained context
- **Educating users on what's possible is a big piece**: How is this different? How dynamic is it? Users need to learn how much they can do through conversation.

### Planning Flexibility — Deeper Model (Session 2, 2026-03-29)
- Multiple entry points confirmed. Each entry point signals intent — the app reads that and guides accordingly.
- If user enters Meal Plan with no plan created: "Let's create a plan — how many meals are you thinking?" (guided, not rigid)
- Maintain context across sessions: "You only planned Monday and Tuesday — want to add more?"
- Proactive suggestions grounded in history: "You liked that recipe 2 weeks ago, want to bring it back? Anything you'd modify?"
- The system should always be providing useful next-step suggestions, not waiting passively

### The "AI Generates the UI" Direction (Session 3, 2026-03-30)
**The core interaction model:** Not chat-first, not static UI with AI bolted on. The AI dynamically assembles a personalized interface based on context. The system comes to you with a proposal — you react, tweak, and confirm rather than creating from scratch. You only type/speak when you want to change something.

**How it evolves over time:**
- Week 1: System doesn't know you, asks more questions (AI interview onboarding)
- Week 12: System knows you so well that it presents a pre-populated week you confirm or tweak
- Interaction gets FASTER over time, not stays the same (opposite of chat)

**Where it feels conversational:**
- Proposals written in natural language, not form labels
- Modifications are conversational ("What do you want instead?" → "Something lighter" → recipe card appears)
- System explains its reasoning ("I put fish on Monday since you're shopping Sunday — freshest that way")
- Voice dictation works naturally because you're reacting, not filling forms

### The "Get It Done" Vision (Session 3, 2026-03-30)
**Griffin's north star, sharpened:** "Get it done." The magical experience is:
- Open the app → it already knows what you want
- Plan my meals → done
- Order my groceries → done, delivered in an hour
- Figure out everything I have → done
- Having a dinner party → here's your full plan with recipes, shopping list, cooking schedule

The product is fundamentally about *removing all the work* from the meal journey. Not a tool you use to do the work — a service that does it for you, with you providing minimal input to guide and refine.

This is an agentic vision — the app acts on your behalf, like saying "Hey, pay this person with Venmo" and it just happens. We're building toward the same for meals.

### Zero-Effort Feedback Collection — The Open Design Challenge (Session 3, 2026-03-30)
**The crux question Griffin identified:** How do we:
1. Be so personalized that users take the LEAST possible actions
2. While ALSO collecting feedback on a zero-effort basis to keep improving

Options to explore:
- Interviewing users conversationally?
- Showing cards of what they had and asking for ratings?
- Too structured feels like a chore
- Implicit signals (what they skip, modify, repeat) might be more powerful than explicit feedback
- Need to figure out: what's the minimum-friction way to learn from users?

This is the hardest UX challenge in the product and directly ties to the memory system architecture.

### Feedback Model — Converged Direction (Session 3, 2026-03-30)
**The "personal chef" mental model.** The interaction should feel like working with a personal chef who knows you, checks in naturally, and adjusts based on your reactions — not like a system collecting data from you.

**Agreed approach — blended, not purely implicit:**
- Primary: implicit signals from behavior (saves, skips, modifications, repeats, dismissals, manual adds). The system being opinionated and proposing things IS the feedback mechanism — every reaction to a proposal is data.
- Secondary: lightweight explicit check-ins where the value is clear to the USER (not the system). Example: opening the new week with a voice dictation prompt — "How were your recipes last week?" User can skip, give a quick voice answer, or tap a fixed prompt ("Great" / "Want to make updates"). Not required, but offered.
- The framing matters: "Your personal chef checking in" not "Rate your experience." User should feel like they're talking to someone who cares, not filling out a survey.
- Explicit feedback is not about making it required — it's about making it available and natural when people WANT to share. People do want to provide feedback when it's easy and clearly valued.
- Fixed quick-response options alongside free-form input — reduce effort for common responses while allowing depth when the user has it.

**What Griffin has seen in his career:**
- Tried purely explicit signals → engagement drops off, feels like homework
- Tried purely implicit signals → misses nuance, can't capture "why"
- The balance is: implicit as the foundation, explicit as the accelerator where it feels natural and has clear user value

**The key test:** Does this feel like "my personal chef asking how dinner went" or "the app asking me to do work so it can get better"? If the former, we're doing it right.

---

## "Taste Profile" Summary

### The Core Metaphor
**Your personal chef.** The app should feel like working with a personal chef who knows you, remembers what you liked, checks in at the right moments, and handles the logistics. Not a tool, not a chatbot — a knowledgeable person who does the work and asks the right questions.

### Product Personality
- **Agentic, not tool-like.** The app does things for you, not with you. You guide and refine; it executes.
- **Conversational but not chatty.** Natural language proposals, not form labels. But not a chat thread for everything.
- **Gets smarter, not repetitive.** Week 12 should feel easier than week 1, not the same.
- **Opinionated but overridable.** The system has a point of view on your week. You can change anything, but you shouldn't have to change much.

### Interaction Principles
- AI generates the UI — dynamic, personalized screens, not static templates
- Multiple entry points, each signaling intent
- No golden path — flexible, non-linear, always easy to come back and iterate
- Capture most intent with AI — preferences set through conversation, not settings screens
- Dictation/voice emphasis — don't force typing
- Show, don't tell — demonstrate what's possible through the experience itself

### What Griffin Does NOT Want
- A static wizard flow (too rigid, commodity, doesn't learn)
- A plain chat window (ChatGPT clone feel, tedious on repeat use)
- Heavy onboarding forms (use AI interview instead)
- Manual effort that the system should be handling

---

## Design Direction (Session 5, 2026-04-05)

### The Design Brief in One Sentence
**"Rich, serious, dense, but also really airy and usable at the same time."** — Griffin describing Flighty, but this IS the target for our app.

### Primary Design References (ranked)
1. **Crouton** — #1 reference. "If you asked me to pick one app to emulate, Crouton." The MVP visual baseline. Liquid glass, dark mode, clean recipe/cook/plan screens. Take Crouton's exact visual design and add AI.
2. **Flighty** — The aspirational quality bar. iOS liquid glass fully embraced. Bottom card modality (card over content). Purple/blue on dark. Data-dense but airy.
3. **Robinhood** — Illustration style (geometric, diagrammy, technical line art), bold limited-palette colors on black, 4-tab IA with depth, information density done right.
4. **Mela** — Proof that one bold accent color + dark mode + big serif headers + whitespace = premium recipe app feel. Minimalism reference.
5. **Function Health** — Interaction model reference (static UI → AI chat transition for creation tasks). Suggestion pills. Structured objects inline in chat. "Building your Protocol" progress steps.

### Design Principles Extracted
- **Dark mode first.** Every reference Griffin loves is dark-mode. This is the default, not an option.
- **iOS Liquid Glass / glass-morphism.** Translucent panels, depth layering, frosted glass cards. Embrace the latest Apple design language. This is non-negotiable for the aesthetic Griffin wants.
- **Limited color palette.** One or two bold accent colors maximum. Crouton uses blue. Flighty uses purple. Mela uses yellow. Robinhood uses green. Pick one and commit.
- **Bold typography hierarchy.** Large serif or san-serif headers, clean body text, strong visual weight differences between hierarchy levels. Whitespace is a feature.
- **No cheesy graphics.** No food emojis as design elements. No confetti celebrations. No cartoon illustrations. If illustrations are used, they should be technical/geometric (Robinhood style) or premium photorealistic (Flighty aircraft renders).
- **Smart inline features.** Crouton's approach of making recipe text interactive (tappable ingredients, auto-detected timers) is the model for how AI should surface in our UI — contextual, inline, not bolted on.
- **Bottom card / sheet modality.** Flighty's persistent bottom card pattern. Could be the AI interaction surface: content behind, AI overlay in front, always accessible.
- **Information density is okay IF the hierarchy is strong.** Don't dumb things down. Show data (nutrition, cost, timing) but with clear visual hierarchy so nothing feels cluttered.

### What This Rules Out
- Light, playful, colorful food app aesthetics (Cooklist, Mealime, Samsung Food)
- Emoji-heavy UI elements
- Rounded bubbly buttons and celebration animations
- Generic green/white meal planning app look
- Any design that could be described as "cheesy," "amateurish," or "childish"

### The Platform Question (OPEN)
Griffin raised: "Would it be easier just to start out building iOS if I want this aesthetic and I'm not going to be happy with anything other than the Apple iOS aesthetic?" This is a real tension:
- The liquid glass / glass-morphism aesthetic is deeply iOS-native. Web CSS can approximate it but won't feel identical.
- Our current plan is web-first (phone form factor) → iOS later.
- If design fidelity to iOS is truly non-negotiable, we may need to reconsider platform sequencing.
- **This needs a decision.** See open questions.

---

## Recipe Discovery Behavior (Session 5, 2026-04-05)

Griffin's actual recipe behavior, from his own description:

1. **Wife finds recipes on Instagram** → shares them. Key use case for share-to-app integration (iOS share menu). Must be frictionless — not copy/paste a URL.
2. **Griffin uses ChatGPT to generate recipes** → "Come up with 3 healthy recipes I can cook on a weeknight with chicken, salmon, or beef." Modifies the output. Then tries to convert into a usable list. This is exactly the flow we're building natively.
3. **Sometimes has existing grocery notes** → pastes into ChatGPT to deduplicate/merge. Another flow we're replacing.
4. **Uses NYT Cooking for search + recent history** → goes there when searching for a specific type of meal. Values recents. Doesn't love NYT's filtering — wants the AI-powered version.
5. **Does NOT browse long recipe lists** → "I don't need to go browse through a big list of recipes." Prefers targeted search or AI recommendations.
6. **Wants AI-generated suggestions with images** → personalized, filtered, visual. Not an infinite scroll catalog.

**Decision signal**: This strongly validates **Option C from last session** — AI-powered discovery that feels like browsing. Not a static catalog. Griffin's own behavior is "tell AI what I want → get recipes back." The browse pattern he values (NYT recents, NYT search) is about finding specific things, not serendipitous browsing.

**Recipe import must be share-menu-native on iOS.** Copy/paste URL is not acceptable — it should be a share target from Instagram, Safari, etc. This has iOS platform implications (share extensions require native code or PWA Web Share Target API).

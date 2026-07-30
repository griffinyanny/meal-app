# Technical Research Notes

Deep dives on key technical questions. Updated as new research is done.

---

## Recipe AI: LLM Capabilities & Architecture (Researched 2026-03-28)

### Can we rely on LLMs for recipe intelligence?
**Yes, for V1.** Claude/GPT-4 class models have excellent recipe knowledge for everyday home cooking. No RAG or custom training needed at launch.

### What works well
- Savory recipe generation from constraints
- Recipe modification (substitutions, scaling, dietary adaptations)
- Dietary framework adherence (keto, paleo, Good Energy) via system prompt rules
- Recipe URL parsing into structured data
- Cooking technique knowledge, flavor profiles

### Known limitations
- **Baking**: Proportions can be wrong. Baking is chemistry; LLMs predict text. Caveat baking recipes or eventually source from verified corpus.
- **Multi-substitution**: One swap is reliable. 3+ simultaneous dietary swaps degrades quality.
- **Nutrition**: Ballpark only (+/- 20-30%). Need USDA FoodData Central for real numbers.
- **Food safety**: Rare but documented cases of unsafe advice. System prompt needs explicit safety guardrails.
- **Originality**: LLMs remix training data, they don't truly invent. Fine for home cooking.

### Recommended architecture
1. **Claude API + strong system prompt** = recipe engine (~$0.01-0.05 per recipe)
2. **USDA FoodData Central API** (free, public domain) = nutrition validation
3. **`recipe-scrapers` Python library + Claude fallback** = URL import (library handles ~70%, Claude handles messy/non-standard)
4. **Claude Vision** = photo/screenshot extraction (~$0.01-0.03 per image)
5. **Skip RAG for V1.** Add later if needed for baking, niche cuisines, or clinical nutrition.

### System prompt is the secret sauce
- Encode dietary rules as explicit blocklists/allowlists
- Specify output as structured JSON (title, servings, ingredients with qty/unit/item, steps, nutrition)
- Include food safety guardrails (minimum temps, allergen flagging)
- Include quality heuristics (prefer <10 ingredients, <45 min, balance flavors)
- Include honesty rules (if impossible, say so)

### Available datasets for future RAG
- RecipeNLG: 2.2M recipes (research license)
- Recipe1M+: 1M recipes + images (MIT)
- FoodKG: Knowledge graph linking recipes, ingredients, USDA nutrition
- Open Food Facts: 4M+ packaged products, barcodes, Nutri-Score

### Available nutrition/food APIs
- USDA FoodData Central: 380K+ foods, free, CC0, 1K req/hr
- Open Food Facts: 4M+ products, free, open database
- Edamam: NLP nutrition analysis, free tier 10K calls/mo
- Spoonacular: All-in-one recipes + nutrition, free tier available

---

## LLM Platform Cost & Quality Comparison (Researched 2026-03-28)

### Model tiers relevant to this app

**Ultra-cheap ($0.0003-0.0015/request)**
- GPT-4.1-nano: $0.10/$0.40 per MTok
- Gemini 2.5 Flash-Lite: ~$0.075/$0.30 per MTok
- DeepSeek V3: ~$0.27/$1.10 per MTok
- Good for: high-volume simple tasks. Risk: may miss subtle dietary rules.

**Sweet spot ($0.0015-0.003/request)**
- GPT-4.1-mini: $0.40/$1.60 per MTok — best structured output guarantee
- Gemini 2.5 Flash: $0.30/$2.50 per MTok — free tier available for prototyping
- Good for: production recipe engine (generation, URL parsing, ingredient normalization)

**Premium ($0.005-0.02/request)**
- Claude Haiku 4.5: $0.80/$4.00 per MTok
- GPT-4.1: $2.00/$8.00 per MTok
- Claude Sonnet 4.6: $3.00/$15.00 per MTok
- Gemini 2.5 Pro: $1.25/$10.00 per MTok
- Claude Opus 4.6: $15.00/$75.00 per MTok
- Good for: complex dietary reasoning, creative recipe modification, fallback for hard cases

### Recommended architecture: Tiered model routing

| Task | Recommended Model | Approx Cost/Request |
|------|------------------|-------------------|
| Recipe URL parsing | GPT-4.1-mini or Gemini Flash | $0.001-0.003 |
| Simple recipe generation | GPT-4.1-mini | $0.0015 |
| Complex modification (dietary, creative) | Claude Sonnet or GPT-4.1 | $0.005-0.02 |
| Photo/screenshot extraction (vision) | GPT-4.1-mini or Gemini Flash | $0.002-0.005 |
| Open-ended chat | Claude Sonnet or GPT-4.1 | $0.005-0.02 |
| Ingredient normalization/merging | GPT-4.1-mini | $0.001-0.002 |

Blended average with 80% routine / 20% complex: ~$0.003-0.004 per interaction

### Prototyping strategy
- Start with **Gemini 2.5 Flash free tier** (zero cost, vision, structured output, 1M context)
- Test quality against GPT-4.1-mini before committing
- Apply for Google for Startups ($350K credits) and Anthropic startup program ($25K)

### Monthly cost projections

| MAU | Est. API calls/mo | Blended cost/mo |
|-----|-------------------|----------------|
| 1K | ~10K | $30-40 |
| 10K | ~100K | $300-400 |
| 100K | ~1M | $3,000-4,000 |

### Decision status
- **Not yet decided.** Will prototype on Gemini free tier, benchmark quality across GPT-4.1-mini / Gemini Flash / Claude Haiku on actual recipe tasks, then decide.
- Key decision factor: structured output reliability (OpenAI has edge) vs. cost (Google has edge) vs. reasoning quality for complex dietary tasks (Claude has edge)
- Prompt caching available on all major platforms (50-90% input cost reduction for repeated system prompts)

---

## Grocery Integrations: API Landscape

> **⚠️ CORRECTED 2026-07-30 (S44).** The 2026-03-28 research below concluded that Instacart was
> partnership-gated and that Kroger should therefore go first. **That conclusion is wrong as of
> July 2026.** Instacart now runs a public Developer Platform with a self-serve dashboard. The
> superseded section is preserved at the bottom rather than deleted, because it was load-bearing
> for the V2 sequencing and the reversal should be legible. Griffin ratified the re-sequencing
> on 2026-07-30 — see `decisions.md`.

### Current state (verified 2026-07-30)

| Platform | Access | What you actually get | BD required? |
|----------|--------|----------------------|--------------|
| **Instacart** | **Public Developer Platform**, self-serve dashboard + dev key | Recipe page + shopping list page, hosted on Instacart Marketplace. Ingredients matched to products at nearby retailers, real inventory/pricing, real checkout | **No.** Dev key self-serve; production key requires a **compliance review, ~30-40 days** |
| **Kroger** | Public API, self-serve | Product search, locations, and a public **Cart API** (add-to-cart, per-user OAuth). Kroger family: Fred Meyer, QFC, Ralphs, Harris Teeter, King Soopers | No |
| Walmart | Affiliate only | Deep links | N/A |
| Amazon Fresh | Closed | Deep links | N/A |

### Instacart Developer Platform (the chosen first integration)

**Docs:** https://docs.instacart.com/developer_platform_api

- **Two endpoints matter to us:** `create_shopping_list_page` (our grocery list → a hosted,
  shoppable Instacart page) and `create_recipe_page` (a recipe → the same, with instructions).
  There is also an **MCP server**, relevant given the app is AI-native: the chef could construct
  the page directly rather than us hand-rolling the call.
- **Architecturally a leaf, not a foundation.** It is one server-side call that takes the grocery
  list we already hold and returns a URL. **No user account linking, no OAuth, no stored retailer
  credentials, no cart state to keep in sync.** That is why it fits the "integrations are
  accelerators, not dependencies" principle better than Kroger does — the list stays our source of
  truth and we hand off.
- **Known limits, accepted going in:**
  - Directing the user to a **specific merchant is not supported**. We send items; Instacart picks
    the store set.
  - **SKU numbers are not a supported way to specify items.** We send ingredient names + quantities,
    which is exactly the shape our list already has. This is a good fit for us and a bad fit for
    anyone wanting "add this exact SKU to my Safeway cart."
- **Approval process (the real cost).** Self-serve dev key → build → request production key →
  Instacart reviews. They check: 100% compliance with the Developer Platform terms, requests
  formatted to spec, **error handling on every endpoint implemented**, and an Enterprise Help Desk
  account. No documented traffic or business minimum. **~30-40 days from access request to
  production key.** Denial is resubmittable after corrections.
  - **Consequence for how we build it:** the review inspects error handling on every endpoint we
    ship, so this cannot be a throwaway spike we rebuild later. It gets built properly once.
- **Revenue, not cost.** On approval you get an invitation to their **impact.com** affiliate
  program and earn commission on attributed orders and new-user signups. No access fee documented
  (not independently verified against a fee schedule).
- **Griffin action required:** creating the developer account, accepting the IDP terms, and stating
  the intended use case are all account-holder tasks. Claude cannot do these.

### Kroger (deferred, optional depth play)

- Still public and self-serve at developer.kroger.com; the public Cart API is live.
- **Why it is no longer first:** it needs per-user OAuth, which drags in the parked
  account-linking question (`open-questions.md`), plus token storage, refresh, and a real failure
  surface — and it buys two banners in Seattle (Fred Meyer, QFC). Heavier integration, narrower
  reach.
- **When it earns its place:** evidence that users want a true in-app cart rather than a handoff.

### Deep link fallback (no approval needed)
- `instacart.com/store/search/{item}` opens a pre-filled search. One item at a time, does not add
  to cart. Strictly a stopgap now that the real API is reachable.

### Recommended path (revised 2026-07-30)
1. **R1 (now):** register for the Instacart Developer Platform and start the approval clock during
   1E.5, because the 30-40 day review is calendar time that cannot be compressed later. Build the
   integration properly against the dev key. Ship "Send to Instacart" on the Groceries tab as a
   **1F** item.
2. **V2:** Kroger Cart API only if in-app-cart demand shows up. Photo/social import and the rest of
   V2 are unaffected.
3. **Unchanged principle:** the manual list must always be perfect. Integrations are accelerators,
   not dependencies. A failed or unapproved integration must degrade to the existing clipboard
   export with no loss of function.

---

### SUPERSEDED — original research (2026-03-28)

*Kept for lineage. Do not act on this; see the corrected section above.*

| Platform | Public API | Cart API | Self-Serve | Realistic for V1? |
|----------|-----------|----------|------------|-------------------|
| Kroger | Yes | Yes (OAuth) | Yes | Best starting point |
| Instacart | Partnership only | Partnership only | No | Deep links only initially |
| Walmart | No (limited affiliate) | No | N/A | Deep links only |
| Amazon Fresh | No | No | N/A | Deep links only |

- **Instacart (believed to require partnership).** "Shoppable Recipes" was the relevant capability,
  used by SideChef, Samsung Food, NYT Cooking, Mealime. Believed NOT to be a public API; believed
  to require a business development partnership, with access granted to apps holding tens of
  thousands of MAU. Recommended approach was to come with traction metrics.
- **Original recommended path:** V1 no integration → V2 Kroger API + deep links → V3+ pursue an
  Instacart partnership with traction data.
- **Why it was wrong:** the Developer Platform either did not exist publicly or was not found in
  March. The error was treating a four-month-old API-availability finding as durable. **Lesson:
  re-verify third-party API availability before it drives sequencing, not after.**

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

## Grocery Integrations: API Landscape (Researched 2026-03-28)

### Summary table

| Platform | Public API | Cart API | Self-Serve | Realistic for V1? |
|----------|-----------|----------|------------|-------------------|
| Kroger | Yes | Yes (OAuth) | Yes | Best starting point |
| Instacart | Partnership only | Partnership only | No | Deep links only initially |
| Walmart | No (limited affiliate) | No | N/A | Deep links only |
| Amazon Fresh | No | No | N/A | Deep links only |

### Kroger (best option)
- Open developer API at developer.kroger.com
- Product search, pricing, store locations, AND cart management via OAuth
- Covers Kroger family: Kroger, Ralphs, Fred Meyer, Harris Teeter, King Soopers, etc.
- Self-serve: sign up, get keys, start building

### Instacart (requires partnership)
- "Shoppable Recipes" is the relevant capability
- Used by SideChef, Samsung Food, NYT Cooking, Mealime
- NOT a public API — requires business development partnership
- Apps that got access had substantial user bases (tens of thousands MAU+)
- Good news: meal planning/recipe apps are exactly what Instacart built this for
- Approach with traction metrics: "X users/month click send-to-grocery"

### Deep link fallback (no partnership needed)
- Construct URLs like `instacart.com/store/search/{item}` to open pre-filled searches
- Works for all platforms but is one-item-at-a-time and doesn't add to cart
- Functional scrappy approach for early versions

### Recommended path
1. V1: No integration. Perfect manual list with export/share.
2. V2: Kroger API (real cart) + deep links for Instacart/Walmart.
3. V3+: Pursue Instacart partnership with traction data.
4. Principle: Manual list must always be perfect. Integrations are accelerators, not dependencies.

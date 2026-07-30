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

> **⚠️ TWICE CORRECTED, 2026-07-30 (S44). Read the whole section before acting.**
> The 2026-03-28 research (preserved at the bottom) said Instacart was partnership-gated, so Kroger
> should go first. Mid-session that was corrected to "Instacart is self-serve, go there first." **Then
> Griffin tried to sign up and could not.** Instacart's application is **closed with no waitlist**.
> The self-serve dashboard language in their docs describes the flow *after* approval; the gate in
> front of it is shut. **Net: ordering stays in V2. Nothing is buildable today except Kroger.**
> See `decisions.md` (2026-07-30, second entry).

### Access reality (verified 2026-07-30) — the availability column is the only one that matters

| Platform | Access **today** | What you'd get |
|----------|-----------------|----------------|
| **Instacart** | **🔴 CLOSED.** *"We are currently not accepting new applications."* + *"There is no waitlist available at this time."* No reopen date | Recipe page + shopping list page, hosted, ingredients matched to nearby retailers, real checkout. **~98% of US households.** The one we want |
| **Kroger** | **🟢 OPEN, self-serve.** Create account → verify email → register app → `client_id`/`client_secret` | Product search, locations, **Cart API** (add-to-cart, per-user OAuth). ~20 banners incl. QFC, Fred Meyer, Ralphs, King Soopers, Harris Teeter, Fry's, Smith's, Dillons, Mariano's — plus **Giant Eagle** (acquired 2026-07-01) |
| Walmart | **🔴 Effectively closed.** *Walmart no longer releases new API keys for its affiliate program.* The Add-To-Cart / OPD grocery endpoints exist but require an Impact Radius partner setup, and Delegated Access key creation retires **2026-07-30** | Largest single grocery retailer. Unreachable for a new solo developer |
| Costco / Albertsons / Publix / Target / Ahold | 🔴 No public cart API | — |
| Amazon Fresh / Whole Foods | 🔴 Closed | — |

**The finding that matters: Kroger is not the *best* open door in US grocery. It is the *only* one.**

### TAM analysis (2026-07-30) — asked for by Griffin: "what national integration has the largest addressable market?"

**US grocery market share, 2026:**

| Chain | Share | Reachable by API? |
|---|---|---|
| Walmart | 23.6% | ❌ no new keys |
| **Kroger** | **~10%** (contracting on share, expanding on footprint via Giant Eagle) | ✅ **yes** |
| Costco | 9.2% | ❌ |
| Albertsons (incl. Safeway, Vons, Haggen) | 6.4% | ❌ |
| Publix | 4.1% | ❌ |

Top five ≈ **53%** of US grocery. **Exactly one of them is reachable.**

**The structural insight: aggregators are the TAM, retailers are not.** One Instacart integration reaches
~98% of US households across 1,800+ banners and ~100,000 stores. Every retailer-direct integration is a
separate build, separate auth, separate failure surface, for **single-digit share each**. You would need
to integrate the entire top five — four of which are closed — to approach what one aggregator
integration gives you.

**That asymmetry is precisely why the aggregator door is gated and the retailer doors are not.** It is
not an accident to route around; it is the shape of the market. The strategy that follows:

1. **Aggregator-first is the only strategy with real TAM.** Instacart is the target. It is closed, so
   the correct move is to **watch for reopening**, not to substitute a worse integration for it.
2. **Kroger is a hedge, not a strategy.** ~10% national share, real national footprint (~2,700+ stores,
   ~35 states), and it is the only thing we can build against without permission. Worth building **if
   and only if** ordering becomes urgent before Instacart reopens.
3. **Do not chase retailers one at a time.** Four of the top five are closed anyway, so the "integrate
   the majors" path is not available even if we wanted it.
4. **Unverified thread for V2:** DoorDash and Uber Eats both run grocery now and both have developer
   platforms. Those platforms are aimed at *merchants and delivery*, not consumer cart-building, so they
   are probably the wrong shape — **not checked**. Worth 20 minutes when V2 opens.

**Griffin's own store, for testing (2026-07-30):** the household shops **Haggen** (an Albertsons banner,
no API). Griffin has offered to shop **QFC** instead, which is a **Kroger** banner and therefore covered
by the one open API. His personal preference and the only available integration happen to coincide.

> **Factual correction to a premise Griffin raised:** the Kroger–Albertsons merger was **blocked and
> terminated in December 2024** (injunctions in D. Or. and King County Superior Court; Albertsons
> terminated and sued Kroger). The Haggen divestiture to C&S died with it, so **Haggen stayed with
> Albertsons** and is not pending divestiture. Kroger instead acquired **Giant Eagle** for $1.65B on
> 2026-07-01 (~197 supermarkets, ~$9B annual sales, OH/PA/WV/MD/IN).

### Instacart Developer Platform (the right target, currently unreachable)

**Docs:** https://docs.instacart.com/developer_platform_api · **Application:** https://company.instacart.com/business/developers

**🔴 Gate status (2026-07-30): CLOSED.** *"We are currently not accepting new applications."* and
*"There is no waitlist available at this time."* The only stated guidance is to check back later. When
it reopens, eligibility is: 18+, a registered business or US/Canada resident, company + contact info,
development experience, and agreement to the terms/API/data-protection policies.

**There is no side door, and we deliberately are not looking for one.** The API key is the only
auth mechanism and keys are issued on approval. The adjacent Instacart surfaces do **not** substitute:
the **impact.com affiliate program** is open and free but gives tracked links and 3% commission rather
than programmatic list creation; **Tastemakers-style shoppable buttons** and **Chicory** (free,
self-serve) both work by parsing recipe markup on a *public web page*, which is the wrong shape for
personalised lists behind auth. **Northfork / SideChef** are enterprise B2B vendors selling to
retailers, a longer path than the application itself. Scraping or undocumented endpoints would violate
the terms we need to be in good standing with when applications reopen, and would forfeit the affiliate
commission. **The workaround costs more than the wait.**

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

### Recommended path (settled 2026-07-30, Griffin's call)

1. **R1: no ordering integration. Clipboard export stays the answer.** Griffin: *"let's move it to v2
   anyway because it's not a critical need. I'd love to get a polished version of v1 first."* The
   pull-forward earlier in S44 was justified by (a) a cheap integration and (b) an approval clock worth
   starting early. **The application is closed, so there is no clock**, and the only buildable
   alternative is the expensive one. Both justifications are gone.
2. **Watch for Instacart reopening.** No waitlist exists, so this is a periodic manual check, not a
   notification we can subscribe to. It is the only integration with real TAM.
3. **V2: Kroger Cart API as the hedge**, built only if ordering becomes urgent before Instacart
   reopens. Accept its cost honestly — per-user OAuth, token storage/refresh, and it re-opens the
   parked account-linking question — in exchange for ~10% of US grocery.
4. **Do not integrate retailers one at a time.** Four of the top five are closed, and the math does not
   work even if they were open. See the TAM analysis above.
5. **Unchanged principle:** the manual list must always be perfect. Integrations are accelerators, not
   dependencies. Any integration must degrade to clipboard export with no loss of function.

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

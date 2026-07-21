# Recipes tab (Phase 1D, Slice D) — design brief (TO-GENERATE)

> **This is a to-generate brief — the design does NOT exist yet.** The Recipes tab is the plainest
> surface in the app and has never had a design pass. Slice D reorganizes it, so we design it properly
> first (new surface + open IA = strong-recommend per the design-pass gate). Feed this to the meal-app
> project in Claude Design. Loop + round-trip mechanics: `../../design-workflow.md`.
>
> **Created:** 2026-07-21 (S26) · **Surface:** Recipes tab · **Scope item:** `docs/scope-1D.md` #14
> **Pass depth:** targeted-to-deep — this is a real IA change, worth 2 directions if the tier model is genuinely uncertain.

## What it is

The Recipes tab is the household's recipe collection. **Today it's a flat, reverse-chronological card
list** with a search box and two buttons (Generate / Import URL) — no structure, everything in one pile,
newest first. See the live surface: `src/components/recipes/recipe-library.tsx` + `recipe-card.tsx`.

**Why it needs to change now:** as of Phase 1D, recipes arrive from three very different places, and the
flat list can't tell them apart:
1. **Deliberate library** — recipes the household chose: AI-generated on request, imported from a URL, or
   hand-entered. These are "theirs."
2. **Plan drafts** — recipes auto-hydrated for a meal plan's slots (`sourceType:"plan_generated"`,
   `sourcePlanId` set). These are ephemeral — they cascade away when the plan is replaced, and can pile up
   fast. Without separation they drown the deliberate library.
3. **Cooked history** — recipes actually cooked (derived, no explicit "I cooked it" — see the backend gap
   below). The record of what the household has made.

The reorg gives the tab structure that respects those three origins, keeps the deliberate library front and
center, lets plan drafts be visible-but-secondary (and graduate to the library via favoriting), and surfaces
cooked history — while **search still reaches everything** regardless of tier.

## States to design

1. **The organized library (primary state)** — how the tiers present. This is the whole ballgame.
2. **Search-active** — a query is typed; results span all tiers. Flat list, or grouped-by-tier? (open)
3. **The recipe card** — anatomy in this new context: does a card carry a provenance/tier signal (e.g. a
   "plan draft" vs "yours" badge, a cooked checkmark), or is origin conveyed purely by which section it sits in?
4. **Per-tier empty states** — e.g. no cooked history yet, no plan drafts, empty library (first run).
5. **Creation entry points** — Generate / Import URL placement in the reorganized layout (a header action row
   today; may want to live differently with tiers).

## Real data to populate it with

A recipe row today returns: `title`, `description`, `totalTimeMinutes`, `servings`, `sourceType`
(`ai_generated | url_import | manual | modification | plan_generated`), `isFavorite`, `tags[]`.
The tiers derive from: `isFavorite`, `sourceType` (`plan_generated` = draft vs the rest = library),
`lastCookedAt` / past confirmed slot dates (cooked), `sourcePlanId` (which plan a draft belongs to).

Populate with a realistic mix: ~6–10 library recipes (a few favorited), ~4 plan drafts from the current
week's plan, ~3 cooked recipes from past weeks. Use real dish names, not lorem.

## OPEN — iterate on these in Claude Design

- **The tier model itself.** Scope named three tiers (cooked / deliberate-library / plan-drafts). **Griffin
  wants to compare a few directions side by side — generate all three below AND invent at least one of your
  own that we haven't thought of** (a genuinely different interaction model for organizing a growing recipe
  collection on a phone). The goal is to narrow to the right model by seeing it, not to pre-commit.
  - **(a) Three shelves** — "Your recipes" · "From your plans" · "Cooked" as distinct stacked sections.
  - **(b) Primary + foldable** — "Your recipes" primary; "From your plans" a collapsible secondary shelf;
    cooked as a filter/badge rather than its own shelf.
  - **(c) The tight-budget fallback** (scope's stated fallback): one "Your recipes" list with **cooked folded
    to the top and badged**, plan drafts a thin secondary strip. Is this actually the better *default*, not
    just the fallback? Argue it.
  - **(d) Your own** — a fourth direction of your invention. Filters/segmented-control instead of shelves? A
    single smart-sorted list? Something else. Surprise us.
  Every direction must read calm on a 430px phone with a realistic (messy) recipe count.
- **How cooked history reads** — a dedicated shelf, a badge on library cards, or a filter toggle?
- **Card provenance signal** — does a card show its origin (plan-draft badge, cooked check, "yours"), or is
  separation purely structural? (Note: the current card's source label doesn't even handle `plan_generated` —
  it falls through to "Manual." Whatever we design here fixes that.)
- **Favoriting = promote.** Favoriting a plan draft should promote it into the deliberate library (and detach
  it from its plan so it survives). What does that *feel* like visually — animate from the drafts shelf into
  "Your recipes," a badge flip, a heart-fill? Design the promotion moment.
- **Search-results presentation** — flat ranked list, or preserve the tier grouping while searching?

## SETTLED — system-determined, do not redesign

- The visual system: dark glass, `glass-card` rows, eyebrow section headers (`GROCERIES · THIS WEEK` style),
  glass tab bar, accent `#3A86FF`. Inherit it exactly — this is not a new design language (same as Groceries).
- **The recipe-detail screen** (`/recipes/[id]`) — out of this pass. We're designing the *tab*, not the detail view.
- **Generate + Import URL** remain the two creation entry points (they exist and work). Their *placement* is
  open; their existence is settled.
- **Search mechanics** — debounced, server-side, reaches all recipes. Only its *presentation* is open.

## Backend: the cooked signal — RESOLVED (Griffin, S26)

The column `lastCookedAt` existed but nothing wrote it, so "cooked" had no data source. **Decision:** a recipe
is **cooked when it is the recipe of a confirmed plan slot whose date has passed** — fully automatic, no
"I cooked it" tap (matches the scope's "no explicit mark" intent). The build **stamps `lastCookedAt`** at that
moment (durable, not recomputed every read). So the design can show a populated cooked tier; the build earns it
by harvesting past confirmed slots. Design shows the tier as if populated.

## After the pass (build + verify)

1. Griffin shares the chosen screen's `claude.ai/design` URL → Claude Code imports via
   `DesignSync.get_file(<projectId>, "<name>.dc.html")`, saves `imported.dc.html` here, records URL + projectId.
2. Build in real components (never paste the `.dc.html`).
3. Verify: extend the E2E harness to the Recipes tab (seed states + specs — first Recipes coverage) →
   `/visual-qa` against the imported design → ux-design-critic taste pass → Griffin's taste review.

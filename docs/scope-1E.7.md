# Phase 1E.7 Scope — Design-system sweep (mechanical)

> **Spoke of** [scope-v1.md](scope-v1.md). **Milestone M5.7: one palette across the app.**
> **Ordered BEFORE 1E.5's build.** Opened + closed S42 (2026-07-27).
> **Source of truth:** `docs/design/system/design-spec.dc.html` (Design Specification v1.0,
> theme 11i, "Gold voice, cream hand"), §12 migration table.

---

## Why this phase exists

The design system arrived as a finished specification in S39, mid-1E, rather than being authored
during 1F as planned. Its §12 migration table splits cleanly into **mechanical** items and
**surface-specific** ones, and the mechanical half was worth doing immediately: **1E.5 rebuilds Plan
from scratch**, and building the signature surface against a palette we have already retired means
building it twice.

Onboarding was migrated in S39 as pass 1 and is the worked example. This phase is pass 2. Pass 3 is
1F.

## In scope — the four items

| # | Item | Source |
|---|------|--------|
| **01** | Every `rgba(255,255,255,x)` → `rgba(240,222,190,x)` at the same alpha | spec §12 item 01 (law 04) |
| **02** | Ambient wash normalised to the three named recipes | spec §12 item 02 (law 01, §03) |
| **06** | Radii onto the eight-rung scale (7/9/12/14/16/18/22/46) | spec §12 item 06 (§11) |
| **—** | The pre-spec `:root` family retires; every surface runs on `--spec-*` | scope-v1 1E.7 checklist |

**Surfaces:** Plan, Recipes, Groceries, You, Onboarding — plus the shell (`app-shell`, `tab-bar`),
the shadcn primitives under `ui/`, `shared/`, and the dev-only debug HUD.

## Explicitly OUT of scope → 1F

These are the surface-specific half of the same migration table. Each wants its **own** `/visual-qa`
pass, which is exactly why they are not bundled here — one sweep of all seven items would be an
unreviewable diff.

| # | Item | Where it still lives in the build |
|---|------|-----------------------------------|
| **03** | Retire the indigo draft pill + the iOS green check → `#9CB86F` | `recipe-card.tsx`, `cooked-strip.tsx`, `grocery-list-header.tsx` — 10 remaining `#30D158` literals |
| **04** | Collapse the double bottom bar (delete the floating search pill + FAB, search into the header, square the nav's top corners) | `recipe-toolbar.tsx`, `tab-bar.tsx` |
| **05** | 44px hit targets on every icon-only control | `recipe-card.tsx` heart, and the same rule app-wide |
| **07** | Promote faked subsection headings to real Group/Row title levels | You, Groceries, Onboarding |

**Also deliberately left:** the four `#FF9F0A` amber merge/dedupe markers in Groceries. The spec says
there is *no caution hue* because amber is the chef — so an amber "these merged" dot beside a gold
chef is a real conflict, but resolving it is a semantic decision about a specific surface, not a
token swap. Logged for 1F alongside item 03.

## What was actually done (S42)

### The token layer — `src/app/globals.css`

**The `:root` retirement is a repoint, not a delete.** `--background` / `--border` / `--primary` and
the rest are consumed by Tailwind's `@theme inline` block and by every component under `ui/`, so
deleting them would mean rewriting ~200 class usages for no visual gain. Instead each one became an
**alias onto the spec token that plays its role**. There is no longer a second palette to mix with —
one palette, reachable under two sets of names.

The load-bearing line is `--primary`, which went **`#3A86FF` → `var(--spec-action)` (cream)**. Indigo
is not a colour in this system: spec §01 admits cream (what you press) and gold (the chef) and no
third accent. Every `bg-primary` in the app is a button, so the alias is the whole of the fix — but it
repaints every primary button in the product and is **the single most visible change in this sweep**.

Also in the token layer:
- **Two new opaque steps**, `--spec-raise-1` (`#251E17`) and `--spec-raise-2` (`#2F261E`), each the
  composite of the matching elevation utility over the floor. They exist for the handful of shadcn
  slots (`--card`, `--popover`, `--secondary`, `--muted`) that are used as solid fills behind other
  blurred surfaces and genuinely cannot be translucent. Deriving them from the ladder rather than
  inventing them is what keeps a solid card and a `.spec-glass` card reading as one material.
- **The glass trio merged onto the elevation ladder.** `.glass-surface` and `.glass-card` are now L2
  glass; `.glass-sheet` is the L5 floating surface. They keep their names (the component rule mandates
  them, 48 call sites read them). The one role that could **not** survive the merge is the **tab bar**,
  which was on `glass-surface` and is *chrome* — chrome sits darker than the floor, glass sits
  lighter, and one utility cannot be both. It now says `.spec-chrome` at its single call site.
- **`.shimmer-bar` and `.animate-highlight-ring` went indigo → gold.** This is not a neutral swap:
  both mark *the chef working*, which is precisely what law 02 reserves gold for. It is also the
  answer the Plan design pass independently reached for its own landed ring (open-questions, S41).
- **The radius scale was replaced, not rescaled.** It had been a multiplier chain off one `--radius`,
  producing 7.2 / 9.6 / 16.8 / 21.6 / 26.4 — none of them on the scale. The named Tailwind steps now
  **are** the rungs: `sm`=7, `md`=9, `lg`=12, `xl`=14, `2xl`=18, `3xl`/`4xl`=22. Rungs 16 and 46 have
  no name on purpose — 16 is written `rounded-[16px]` at the few primary buttons that take it (the
  onboarding idiom), and 46 belongs to the screen itself, which we do not round.

### Item 01 — 28 files

Every Tailwind `white/x` utility (both the `/5` shorthand and the `/[0.04]` arbitrary form) became
`[rgba(240,222,190,x)]` at the same alpha, scripted so the alpha could not drift. Zero `white/`
and zero `rgba(255,255,255,x)` remain in `src/`.

The `:root` retirement dragged three more literal families with it, because leaving them would have
produced exactly the half-migrated state globals.css warns about:
- **The iOS red family** (`#FF453A`, `rgba(255,69,58,x)`, `#FF6961`, `#FF9B94`, `#FFD9D6`) →
  the warm destructive. The You tab's safety objects took the **reflect screen's literal values**
  rather than a mechanical alpha-preserving swap, because they are the same object rendered twice and
  onboarding is the worked example.
- **The cool greys** `#F5F5F7` / `#C7C7CC` / `#E5E5EA` → `--spec-text-primary` / `-body`.
- **`themeColor: "#0E0E10"`** in `layout.tsx` → `#0F0B08`. The browser chrome was still the retired floor.

### Item 02 — additive, not a normalisation

**The spec's "six different gold opacities" describes the design frames, not our code.** In the build,
Plan / Recipes / Groceries / You had **no ambient wash at all** — only onboarding did. So this item
meant giving each surface its named recipe for the first time, in `app-shell.tsx`, keyed off the route.

The assignment is by role rather than by taste: **`ambient`** on the two surfaces where the chef is
talking *to* you — Plan proposes the week, You is what it remembers about you — and **`flat`** on the
two you work *in*, where a brighter wash competes with a dense list you are scanning. **`hero`** stays
reserved for screens the orb is on, which today is the interview only.

The layer is `fixed`, not `absolute`, so the light stays where it entered from while the page scrolls
under it. A wash that scrolls away is a gradient, not lighting.

### Item 06 — radii

Off-rung values found and moved: `11px` ×7 → 12 · `10px` ×3 → 12 · `15px` ×2 → 16 · `20px` ×2 → 18 ·
`21px` ×2 → 22 · `rounded-4xl` badge → 9 · bare `rounded` (4px) skeletons → 7. Sheets and dialogs
(`drawer.tsx`, `dialog.tsx`, the three recipe dialogs) took the **22** rung; the Plan hero cards took
22 as feature cards while list cards stayed at 18. Two control sites under 26px tall (the constraint
chip's close button, the `xs` button/badge sizes) took the **7px floor** rather than a rung.

The onboarding meter's `rounded-[3px]` track became `rounded-full`: §11 says hairlines are capsules at
half their own height rather than a rung, and Groceries' progress bar already did it that way.

**Onboarding was swept too.** "Onboarding is the worked example" means match its *token discipline* —
it was not exempt, and it carried four off-rung radii of its own.

### The gold line (ratified by Griffin, S42)

> **Gold marks the chef speaking, not content you read.**

Recorded in [decisions.md](decisions.md); closes the S40 gold-budget question in
[open-questions.md](open-questions.md). Applied to all four onboarding conflicts — see decisions.md
for the per-conflict reasoning.

## Acceptance criteria

- [x] Zero `rgba(255,255,255,x)` and zero `white/x` in `src/`
- [x] Zero pre-spec hex literals (`#0E0E10` `#1A1A1E` `#22222A` `#F5F5F7` `#8E8E93` `#3A86FF` `#5E5CE6` and the iOS red family) outside the two 1F-routed families named above
- [x] Every `:root` bridge token aliases a `--spec-*` token; no independent colour values remain
- [x] Every radius in `src/` lands on 7/9/12/14/16/18/22/46, `rounded-full`, or `rounded-[inherit]`
- [x] Each of the five surfaces carries exactly one named wash recipe
- [x] 480 unit + 78 E2E green, lint + typecheck clean
- [x] `/visual-qa` re-capture across all five surfaces, 0 blockers / 0 high

## Change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-27 (S42) | Phase opened + closed. Items 01/02/06 + the `:root` retirement swept app-wide across 5 surfaces, the shell, and the `ui/` primitives. The gold line ratified and applied to all four onboarding conflicts. | 1E.5's build lands next and rebuilds Plan from scratch; sweeping first is the difference between building the signature surface once and building it twice |
| 2026-07-27 (S42) | Item 02 re-scoped from "normalise" to "introduce". | The spec's six-gold-opacities complaint was about the *design frames*; the build had no ambient wash outside onboarding at all, so there was nothing to normalise |
| 2026-07-27 (S42) | The `:root` retirement implemented as an alias layer rather than a deletion; `--primary` indigo → cream carried with it. | Deleting the bridge means rewriting ~200 class usages for no visual gain. Aliasing achieves "one palette" in one file — and `--primary` is the one alias with a large visual consequence, called out rather than buried |
| 2026-07-27 (S42) | The iOS red family, the cool greys, and `layout.tsx`'s `themeColor` swept alongside item 01 despite not being `rgba(255,255,255,x)`. | They were the pre-spec `:root` family's literals. Warming the neutrals while leaving iOS red beside warm destructive is the half-migrated state globals.css explicitly warns is worse than either end state |
| 2026-07-27 (S42) | `#30D158` (10 sites) and `#FF9F0A` (4 sites) deliberately left in place. | Item 03's territory, routed to 1F where it gets its own `/visual-qa` pass. The amber conflict is a semantic call about a specific surface, not a token swap |

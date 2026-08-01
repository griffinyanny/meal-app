# Design Workflow — Claude Design as the default design partner

*Established Session 20 (2026-07-13). Refined Session 21 (2026-07-19) with the FFOS-proven
mechanics (round-trip solved, one-app-project model, PROJECT-CONTEXT pattern). Supersedes the
Figma + Figma Make operating model.*

## Why this exists

The product IS code (Next.js + Tailwind v4 + shadcn + a bespoke glass layer). Our design system
lives in `src/app/globals.css` + the shipped components, not in a Figma file. Claude Design reads
that system directly, so the old Figma round-trip collapses: Griffin iterates visually in Claude
Design against our real system → hands a URL back → Claude Code builds it in real components.

## Roles

| Piece | Job |
|-------|-----|
| **Claude Code** | Source of truth (context, scope, decisions) + the build. Writes briefs, imports Griffin's chosen direction, builds it in real components. |
| **Claude Design** (claude.ai/design) | Griffin's visual iteration surface. Generates directions that inherit our system; he tweaks/picks without routing every change through Claude Code. |
| **The meal-app design project** | **ONE Claude Design project for the whole app** (a plain project — Griffin creates it in the claude.ai UI). Holds `PROJECT-CONTEXT.md`, the **GitHub connection**, and every design chat (project-scoped memory — the whole app accrues here over time, so you can see how it's coming together). NOT a per-screen project. |
| **Two-way bridge** | Code→Design: the **native GitHub connector** inside Claude Design (Griffin enables it; auto-tracks the raw repo) + `PROJECT-CONTEXT.md` (the distillation that stops it reinventing our system). Design→Code: **`DesignSync.get_file`** (see the solved round-trip below). |

**On the design-system bundle:** meal-app also has a pushed `DesignSync` design-system project
(`docs/design/system/*.html`, id `eb7a2cae-e0e4-4931-af36-a5ff8995ad53`). Per the S21 reconciliation
(FFOS proved one-app-project + GitHub + PROJECT-CONTEXT is what actually works), that separate
design-system project is now **dormant/optional** — not load-bearing. The local `docs/design/system/`
cards stay as a repo visual reference and the source for the PROJECT-CONTEXT token pin. Don't
re-sync it unless we later decide the curated Design-System-pane view earns its maintenance.

## The design-pass gate (Griffin's rule)

**Whenever work is visual, Claude Code explicitly OFFERS a design pass — never silently skips,
never auto-runs.** The offer carries three things: (1) recommendation, (2) what the pass buys
*here*, (3) where returns diminish. Griffin decides. Calibration:
- **New surface** (new screen/tab/state) → **strong recommendation**.
- **Novel interaction** discovered mid-build → **recommend**, scoped to that element.
- **In-pattern addition** (a card variant, a sheet reusing existing vocabulary, copy) → **lean
  skip** — the system already determines it; `/visual-qa` catches drift. Still mention it.

**Pass depth** scales to novelty (FFOS pattern): deep pass (2-3 directions) for an emotional
centerpiece; targeted pass (1 direction) for a contained new layout; build-direct on anything
the existing vocabulary already answers. Not every screen earns a pass.

## The per-pass loop

1. **Brief** — Claude Code writes a tight brief in `docs/design/surfaces/<surface>/brief.md`
   (format: `brief-plan-states.md`): what the screen is, states to design, real data to populate
   it, and explicitly **OPEN (iterate here) vs SETTLED (system-determined, don't touch)**.
2. **Generate** — Griffin opens the meal-app project in Claude Design, feeds the brief; it
   generates directions inheriting our system (via GitHub connector + PROJECT-CONTEXT). Tweaks/picks.
3. **Hand back** — Griffin shares the chosen screen's `claude.ai/design` URL.
4. **Import + save down** — Claude Code pulls it via the round-trip below AND snapshots it into
   the surface folder (URL + projectId + a "what changed / what's open" note).
5. **Build** — Claude Code builds it in real shadcn/Tailwind + our glass layer. **Never a paste of
   the generated HTML** (it's illustrative `.dc.html`, not production code).
6. **Verify** — mechanical E2E (extend the harness for the new tab) → `/visual-qa` → ux-design-critic
   taste pass → Griffin's taste review.

## The round-trip — SOLVED (via FFOS, 2026-07-18)

The `claude.ai/design/p/<projectId>?file=<name>.dc.html` app URL Griffin pastes is
**Cloudflare-gated**: direct `curl`/`WebFetch` return 403, and `import-claude-design-from-url`
**rejects it** (it wants a raw `claudeusercontent.com` bundle URL the app URL isn't). **The method
that works:**

1. Parse the **`projectId`** out of the pasted URL (`/design/p/<projectId>?...`).
2. `DesignSync.get_file` with that `projectId` passed **explicitly** and `path="<name>.dc.html"`.
   The `+` in the URL's `?file=` is a **space** in the path. It reads via Griffin's claude.ai login
   even though the app project is a plain `PROJECT_TYPE_PROJECT` (so it never shows in `list_projects`).
3. Extract the JSON result's **`content`** field → save to `docs/design/surfaces/<surface>/imported.dc.html`.
4. Build against the layout — **not the numbers**: the `.dc.html` is self-contained inline-styled
   HTML with `<sc-for>`/`<sc-if>` directives and `{{ }}` placeholder values that are illustrative
   only. Build against our real data.

So: Griffin pastes the app URL → grab projectId → `get_file` → save down → build. No manual download.

## The save-down ritual (MCP-first)

The durable pointer is the **design projectId**, not a downloaded file — Claude Code can re-fetch
any design via `get_file` anytime. Per surface, in `docs/design/surfaces/<surface>/`:
- **Always** record the design **URL + projectId** and a short build-notes line (what was built,
  which OPEN questions resolved). That's the shared memory between Griffin's iteration and the build.
- **Optionally** keep `imported.dc.html` as an as-built snapshot when provenance matters (the live
  design drifts as Griffin iterates). Claude Code writes it from the `get_file` result automatically.

## Relationship to the 1F design-system pass (answers "is the system baked?")

**YES, as of 2026-08-01 (S58).** ⚠️ **This section used to say "No — and deliberately," and told you to
prototype in a "clean-but-plain vocabulary" and "protect it, don't polish ahead of the app." Both
sentences are now false.** 1F Workstream B closed at 9 of 9: the type scale (all ten §05 rungs named as
real classes), motion, the component library and the caps rungs are done.

What that changes for a pass:
- **Inherit the system, do not evolve it.** A generated direction that introduces a new colour, radius,
  type size or component family is **drift to correct, not a decision.** That is the opposite of the
  instruction this section carried while B was open.
- `PROJECT-CONTEXT.md` is still the living pin and is current as of S59 — it carries the ten type rungs
  by class name. **Read it before generating anything.**
- The one thing still genuinely open is **net-new surface that exists in no spec** — which is precisely
  why Workstream C (icon, splash, install prompt, offline states) gets a pass and B did not.

*(This section going stale one session after B closed is the third instance in these docs — `PROJECT-CONTEXT.md`
and `visual-qa-rubric.md` were the other two, both fixed in S59. **When a workstream closes, grep every file
in `docs/design/` for its name**, not just the two you remember.)*

## Fallback ladder

1. **Claude Design** (default).
2. **Inline Artifact mock** — Claude Code generates an HTML mock with real tokens in-session. Faster,
   but Griffin reacts rather than drives.
3. **Figma escape hatch** — Figma MCP stays registered. Only if a designer ever joins.

## One-time setup (Griffin's manual claude.ai actions — not doable from Claude Code)

1. Create ONE plain project in claude.ai/design for meal-app (the whole app lives here over time).
2. Enable the **GitHub connector** on it, pointed at the meal-app repo (auto-tracks the code).
3. Paste `docs/design/PROJECT-CONTEXT.md` in as the project's read-me-first context.
4. First real use = Phase 1D Groceries (`docs/design/surfaces/groceries/brief.md`, written at 1D kickoff).

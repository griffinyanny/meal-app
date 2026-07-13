# Design Workflow — Claude Design as the default design partner

*Established Session 20 (2026-07-13). Supersedes the Figma + Figma Make operating model
(`decisions.md` 2026-03-29, master plan "Operating Model: Figma + Claude Code").*

## Why this exists

The product IS code (Next.js + Tailwind v4 + shadcn). Our design system lives in
`src/app/globals.css` + the shipped components, not in a Figma file. Claude Design reads
that system directly, so the old 4-hop Figma Make dance (Claude writes a Make prompt →
Griffin pastes into Make → generates → Claude reads back via MCP → re-implements) collapses
to: Griffin iterates visually in Claude Design against our real system → hands a URL back →
Claude builds it. No designer on the team means Figma's precision tooling (pixel-drag,
Auto Layout, Components) was capability we paid a context-switch for and never used.

## Roles

| Piece | Job |
|-------|-----|
| **Claude Code** | Source of truth (context, scope, decisions) + the build. Writes design briefs, imports Griffin's chosen direction, builds it in real components. |
| **Claude Design** (claude.ai/design) | Griffin's visual iteration surface. Generates directions that inherit our system, lets him tweak/pick without routing every change through Claude. |
| **The DS project** | `Meal App Design System` — project `eb7a2cae-e0e4-4931-af36-a5ff8995ad53`. A synced snapshot of our SHIPPED vocabulary (tokens, glass surfaces, meal-card, chips, sheets). Claude Design applies it to new surfaces automatically. |
| **The two-way bridge** | Code→Design: `DesignSync` tool (`create_project`/`finalize_plan`/`write_files`). Design→Code: `mcp__plugin_vercel_vercel__import-claude-design-from-url` (fallback: `WebFetch` a claude.ai/design URL, then `DesignSync.get_file`). |
| **/visual-qa** | Downstream verification — unchanged. Captures the BUILT screens, critiques vs the rubric. Sits after the build, not before. |

## The design-pass gate (Griffin's rule — how Claude decides to raise it)

**Whenever work is visual, Claude explicitly offers a design pass — never silently skips, never auto-runs.** The offer always carries three things:
1. **Recommendation** — do the pass, or skip it, stated plainly.
2. **What the pass would buy** — why it helps *here*.
3. **Where returns diminish** — the honest counter.

Griffin decides. Calibration:
- **New surface** (new screen / tab / state with no existing design) → **strong recommendation** to do the pass. Groceries, the You tab, a novel empty state.
- **Novel interaction** discovered mid-build (e.g. the ingredient merge-review UI) → **recommend** a pass scoped to just that element.
- **In-pattern addition** (a new card variant, a sheet reusing existing vocabulary, a copy change) → **lean skip** — the system already determines it and `/visual-qa` will catch drift. Still mention it so Griffin can override.

The point: Griffin always gets the *opportunity*, plus Claude's honest read of whether it's worth it. He is never surprised by a visual change that didn't get offered a pass, and never forced into a pass that's busywork.

## The per-pass loop

1. **Brief** — Claude writes a tight per-surface brief (format: `brief-plan-states.md`): what the screen is, the states to design, content to populate it with (real, not placeholder), and **explicitly what's open to iterate vs. what's system-determined** (see next section).
2. **Generate** — Griffin opens Claude Design, feeds the brief; it generates 2-3 directions inheriting the DS project. He tweaks with the sliders / inline edits, picks one.
3. **Hand back** — Griffin shares the chosen screen's claude.ai/design URL.
4. **Import** — Claude pulls it via `import-claude-design-from-url` (or the fallback ladder) and reconciles it against the real components.
5. **Build** — Claude builds it in real shadcn/Tailwind, not a copy of the generated HTML.
6. **Verify** — mechanical E2E (extend the harness for the new tab) → `/visual-qa` → ux-design-critic taste pass → Griffin's taste review.

## "What should I iterate on?" (answering Griffin's ask)

Every brief and every hand-back names two lists so Griffin doesn't burn time on settled things:
- **OPEN — iterate here:** the genuinely undecided bits (e.g. "how does the merge-review surface read? list vs. grouped-by-aisle? how prominent is the AI's merge explanation?").
- **SETTLED — don't touch:** anything the design system already determines (colors, glass surfaces, card anatomy, type scale). If Claude Design drifts these, it's noise to correct, not a decision.

## Re-sync rule (keep the DS project honest)

The DS project must track SHIPPED reality, not aspiration. After any phase that ships visual
changes — and at the 1F polish pass — refresh the bundle in `docs/design/system/` and re-push
via `DesignSync` (`finalize_plan` writes=`docs/design/system/**` → `write_files`). If the project
drifts ahead of the app, prototypes inherit a system that doesn't exist yet.

## Relationship to the 1F design-system pass (important boundary)

This workflow does **not** define the design system. The deliberate system (type scale,
spacing, motion, refined component library) is still the dedicated **1F pass** after the V1
flow is complete (decision 2026-07-09). Until then:
- The DS project is a **descriptive snapshot** of the current clean-but-plain vocabulary — prototype in it, don't polish ahead of the app.
- **1F will happen largely IN Claude Design**: the polish pass uses this same project as its venue, designs the real system there, then re-syncs it back to code. Phase A built the scaffolding 1F lands into, not an early 1F.

## Fallback ladder

1. **Claude Design** (default).
2. **Inline Artifact mock** — if Claude Design is unavailable/failing, Claude generates an HTML/Artifact mock using the real tokens, in-session. Faster but Griffin reacts rather than drives.
3. **Figma escape hatch** — the Figma MCP registration is retained (not removed). Reach for it only if a designer ever joins and needs pixel-precision tooling.

## Calibration notes (filled from real use)

- **Round-trip channel:** _pending first smoke test_ — record which of `import-claude-design-from-url` / `WebFetch` / `DesignSync.get_file` actually round-trips a Claude Design URL into code, and any gotchas.
- **First real use:** Phase 1D Groceries (the merge-review UI is the novel bit). Fold first-run friction back into this section.

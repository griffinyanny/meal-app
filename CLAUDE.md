# Meal Management App - Project Context

## What This Is
An AI-powered meal management app that unifies the full meal journey: recipe discovery -> meal planning -> grocery list -> shopping -> pantry -> health/diet adherence. Intended as a productized freemium app.

## Who Griffin Is
Senior product manager (not an engineer). 10 years in tech, 6 working closely with engineers. Understands technical concepts at product level. Does not write code. Relies on Claude as technical partner.

## How to Work on This Project
- **Check in before building.** Walk through the approach before writing code.
- **Explain at the right level.** Griffin knows APIs, databases, frontend vs backend, deployment. Bridge the gap on syntax, framework internals, and implementation details.
- **Advise on technical decisions.** Give recommendations with short reasons.
- **Keep it real.** Flag bad ideas, complexity, or simpler alternatives directly.

## North Star
"I have no idea what to cook" -> "My grocery list is ready" in under 10 minutes.

## Current Phase
**Phase 1D (Groceries) is COMPLETE and shipped to prod (Session 28, 2026-07-21) — 4 of 6 R1 phases done.** **BUG-004 (grocery-list latency) is now CLOSED + shipped (Session 30, 2026-07-21):** the ~27–37s batched `ingredient-normalize` is entirely off the confirm path — recipes normalize per-recipe during plan review (decoupled `plan.normalizeSlot` fired by the walker) and cache on the recipe row (`normalized_ingredients`, migration `0005`); confirm reads the cache + AI-normalizes only misses → zero AI calls at confirm on a fully-reviewed week. Phase D added the honest "Finishing N recipes…" straggler hint + early-confirm instrumentation. The real-model eval PASSED (per-recipe == batch merge quality; scallion↔green-onion synonym holds with no co-occurrence advantage). Code review found + fixed a high-sev rate-limit fan-out (`bgAiProcedure` — background normalize gets its own bucket so it can't 429 a user-visible hydrate). 306 unit + 53 E2E green. **BUG-002 (duplicate merge rows) + BUG-001 (quick-add category misfire) are now CLOSED + shipped (Session 31, 2026-07-22):** a **buy-unit table** in the aggregator (`src/server/grocery/buy-units.ts`) consolidates items a shopper buys as one thing — staples (salt/pepper/oils/spices) collapse to one unquantified row, concrete buy-unit produce (carrot→lb, onion→count) sums the buy-unit and absorbs off-units without fake conversion, keyed on canonicalName so it can never mis-merge; `guessCategory` now matches whole words. Both 300-line splits done (`aggregate.ts`→`quantity-parse.ts`, `grocery-generate.ts`→`grocery-collect.ts`). 327 unit + 53 E2E green. **Only BUG-003 remains open. Current focus: Phase 1E (You tab) — next R1 phase, design-gated. Next session on Sonnet 5. See `docs/whats-next.md`.** — History below is retained for context.

Phase 1D: Groceries (M4 — a confirmed plan produces a usable grocery list). Slice 0 (docs) + A (hydration spine) + B (list generation + hybrid merge) + **Slice C (the shoppable list UI) COMPLETE as of Session 25**: the imported Groceries design is now interactive — grouped↔ungrouped organize toggle with `@dnd-kit` **touch-first** drag-reorder (sections + items, persisted via `aisleOrder`/`position`), inline merge-review (amber dot when `sources.length > 1` → per-meal breakdown + `splitItem`), one-zone GOT IT check-off + progress + completion banner, quick-add (optimistic + `tidyItem` AI categorize + client dedupe pill), clipboard export. 7 new household-scoped grocery mutations (`editItem`/`splitItem`/`clearChecked`/`tidyItem`/`setOrganizeMode`/`reorderSections`/`reorderItems`) + an optimistic `use-grocery-mutations` hook modeled on Plan; GR1–GR7 E2E + grocery seed states. 248 unit + 37 E2E green. **Architecture note (Griffin, S25):** the whole app stays on ONE architecture — Slice C added zero new patterns beyond `@dnd-kit` (the app's go-forward drag solution, chosen touch-first to build toward the native phone gesture). The Groceries screen is the highest-fidelity surface so far; a **1F visual-refresh of Plan** to match is logged in idea-backlog. **Slice D partial (S26):** the two Groceries-tab pieces shipped — the **staples chip row** (`staples` router + `StaplesRow`, tap-to-add reusing `grocery.addItem`, offered-not-auto) and **Talk-to-the-Chef** (the `grocery-talk` NL→ops AI task + `grocery.talk` router with **`[N]`-ref ID-safety** — the model never sees/emits a db id — reusing the relocated shared `TalkToChefSheet`). 287 unit + 41 E2E green. **Slice D COMPLETE (S27):** the **Recipes-tab reorg (#14)** is built from the chosen Claude Design (direction "d" — cooked STRIP + segmented `All/Favorites/Cooked` library + folded `FROM YOUR PLANS` shelf + floating search/＋ toolbar) in real components, plus the **cooked-signal harvest** (`src/server/recipes/harvest-cooked.ts` — lazy/idempotent/non-fatal stamp of `lastCookedAt` from a past confirmed slot; cook + favorite both detach `sourcePlanId` so history/promotions survive plan replacement; draft = `sourcePlanId != null`). First-ever Recipes E2E coverage (RC1–RC10). **294 unit + 51 E2E green.** Design archived at `docs/design/surfaces/recipes/imported.dc.html`. **Only Slice 5 wrap remains** (real-model merge-quality eval + `/code-review` + `/visual-qa` + deploy) to close 1D. Authoritative plan: `~/.claude/plans/rippling-herding-glacier.md`; scope: `docs/scope-1D.md`. (Phase 1C closed S19; 1B completed 2026-05-27, M2: full recipe AI loop on Vercel AI SDK v6 + OpenAI gpt-4.1-mini.)

---

## Session Protocol

### Document roles (read this first)

Two layers of documentation, each with a distinct job:

- **`docs/`** = **living operational state.** Granular, updated session-by-session. Source of truth for "where we are right now," "what decisions exist," "what's open." Files: `whats-next.md`, `changelog.md`, `decisions.md`, `open-questions.md`, `discovery-log.md`, `idea-backlog.md`.
- **`~/.claude/plans/purrfect-hatching-ladybug.md`** = **strategic roadmap.** Phased vision (V1 → V4), architectural decisions, technical strategy, operating model. Refreshed at phase boundaries (Phase 0 → 1, V1 ship, etc.) — NOT every session. If a session resolves a major architectural question, refresh; otherwise leave it alone.

The plan answers "where are we going." The docs answer "where are we right now." Keep them in their lanes.

### Resuming the project ("Resume meal app")
When Griffin says "resume meal app" or starts a new session in this project:
1. Read these files to restore full context:
   - `docs/whats-next.md` — **Exact status and pickup point.** Read this first.
   - `docs/scope-v1.md` — **the Release 1 scope hub** (phase spine, DoD, out-of-scope, post-MVP gate). Read before the phase doc.
   - `docs/scope-<phase>.md` (e.g. `scope-1C.md`) — the active phase's detail: features + acceptance criteria.
   - `docs/changelog.md` — what happened in previous sessions
   - `docs/decisions.md` — all confirmed decisions with rationale
   - `docs/open-questions.md` — unresolved questions
   - `docs/discovery-log.md` — Griffin's preferences, taste profile, and interaction model decisions (critical during Phase 0)
   - `~/.claude/plans/purrfect-hatching-ladybug.md` — the strategic roadmap, for context on where the current work fits in the V1-V4 arc
2. Briefly summarize to Griffin: "Here's where we left off: [status]. We were working on [topic]. Next up: [what's next]."
3. **Scope check (every session, ≤6 lines — momentum over ceremony):** open with a clickable link to [docs/scope-v1.md](docs/scope-v1.md), then: (1) release position — phase X of 6, what's left in the active phase; (2) roadmap position — one line placing R1 on the V1→V4 arc + post-MVP gate status; (3) deltas since last session; (4) items awaiting Griffin's call. Respond to any checkbox/comment edits Griffin made in the scope docs (he may edit directly, but usually he'll just say it — apply his words to the doc). During the session, anything new gets triaged — into scope (change-log line) or to the backlog with a phase tag. Don't build what isn't in a scope doc.
4. If there's an active phase plan in `docs/plans/`, read that too
5. Do NOT ask Griffin to re-explain context. The docs have everything.

### At the END of every session:
1. Update `docs/changelog.md` with decisions made, progress, and discussions
2. Update `docs/whats-next.md` with immediate next steps
2b. Update the active `docs/scope-<phase>.md` (feature statuses, scope-change log lines, open questions). Flip `docs/scope-v1.md` statuses ONLY if warranted — the hub changes on status flips/scope changes/DoD progress, not every session (anti-sprawl rule; phase docs carry the churn)
3. Update `docs/decisions.md` if any new decisions were made
4. Update `docs/idea-backlog.md` if any new ideas surfaced (slot into a phase or leave as Incoming)
5. Update `docs/open-questions.md` if any questions were raised or resolved
5b. Update `docs/bug-tracker.md`: add an Open row for any defect/risk parked this session (id + repro + severity + "address by" + status), and move any fixed items to the Resolved log with the date. This is a HARD step — a bug never gets "deferred to the backlog," it gets a tracked, reproducible entry that we close out. See the tracker's protocol section.
6. Update `docs/plans/README.md` if any plans were created, completed, or changed
7. Update "Current Phase" in this file if phase status changed
8. During Phase 0: update `docs/discovery-log.md` with any preferences, opinions, or insights Griffin shared
9. **Only if the session resolved a major architectural/strategic question** (e.g., locked a phase decision, changed V1 scope, picked a different platform): refresh the master plan at `~/.claude/plans/purrfect-hatching-ladybug.md`. Skip otherwise — the plan is not session state.
10. **ALWAYS paste the next-session kickoff prompt INLINE in the final wrap message** (fenced code block, unprompted). Writing it into `whats-next.md` is required but NOT sufficient — it must also appear verbatim in the chat so Griffin can copy it in one action. He must never have to ask. Offer a design-independent alternative prompt if the planned next step needs a design pass. (Hard rule — see the [[feedback_next_session_prompt]] memory.)

### Phase boundary checkpoints
When crossing a phase line (Phase 0 → 1, V1 → V1.5, V1 ships, etc.):
- Do a full refresh of the master plan to reflect everything that hardened during the previous phase
- Update the "Last refreshed" date at the top
- Commit the plan to `~/.claude/` git repo (the plans dir is tracked)

### When new ideas come up during any session:
- Immediately add to `docs/idea-backlog.md` under "Incoming"
- Don't let good ideas get lost in conversation — capture them in the backlog before moving on
- Ideas from the current phase that belong in future phases go into the backlog with the right phase tag
- Never delete ideas — mark as deprioritized with a reason, or mark as SHIPPED

### When architecture decisions affect future phases:
- Note the dependency in `docs/decisions.md` with a "Future Impact" line
- Cross-reference in the relevant phase section of `docs/roadmap.md`
- If a decision constrains or enables a future idea, note that on the idea in `docs/idea-backlog.md`

---

## Plan Hierarchy

Plans live in `docs/plans/` at three levels. See `docs/plans/README.md` for the full index.

1. **Phase Plans** — one per major phase (V1, V1.5, V2, etc.). Created before starting a phase.
2. **Feature Plans** — one per significant feature. Created when ready to build.
3. **Spike / Research Plans** — for technical investigations or design explorations.

**Rules for planning:**
- Every plan references `docs/roadmap.md` (overall direction) to stay grounded in the big picture
- Every plan references relevant research from `reference/` when making decisions
- When going deep on a specific feature, re-read the roadmap first to ensure alignment
- Plans are never deleted — mark completed with date, or note changes at the top
- When starting a new phase plan, review ALL unphased ideas in `docs/idea-backlog.md` to slot them

---

## Key Project Files

### Master Plan (strategic roadmap)
- **`~/.claude/plans/purrfect-hatching-ladybug.md`** — The strategic roadmap for the project. Contains product strategy, phased roadmap (V1-V4), technical research findings, feature details, and validation approach (the design operating model it describes is superseded — see `docs/design/design-workflow.md`). **Refreshed at phase boundaries, not session-by-session.** For session-level state (what's in flight, what's next, what got decided this week), use the `docs/` files below. See "Document roles" in Session Protocol.

### Tracking & Context (read these to restore context)
- `docs/scope-v1.md` — **Release 1 scope hub**: phase spine (1A–1F) w/ milestones + dates, per-phase checklists, release DoD, explicit out-of-scope, post-MVP gate + V1.5 preview, change log. Linked at every session start.
- `docs/scope-<phase>.md` — **Active phase's scope detail**: in-scope features + acceptance criteria + deferrals + change log. One per phase (currently `scope-1C.md`); created at phase start, closed at phase exit.
- `docs/changelog.md` — Session-by-session log of decisions and progress
- `docs/whats-next.md` — What to do in the next session (always current)
- `docs/decisions.md` — All confirmed product and technical decisions
- `docs/open-questions.md` — Unresolved questions that need discussion
- `docs/bug-tracker.md` — **Every parked defect/risk** with repro + severity + "address by" target + open/closed status. Reproducible bugs live here (distinct from idea-backlog = features, open-questions = decisions). Reviewed + updated every session end.
- `docs/discovery-log.md` — Griffin's preferences, opinions on competitors, UX taste profile (Phase 0)

### Product Direction
- `docs/roadmap.md` — The phased product roadmap (V1 through V4)
- `docs/idea-backlog.md` — ALL ideas with phase assignment, status, and source. Nothing gets lost here.
- `docs/feature-ideas.md` — (Legacy, superseded by idea-backlog.md. Keep for reference.)

### Plans
- `docs/plans/README.md` — Index of all plans (phase, feature, spike)
- `docs/plans/*.md` — Individual plan files

### Research & Reference
- `reference/Meal Management Cooking App Deep Research and Competitor Synthesis .md` — **GOLD MINE.** Competitor analysis, user feedback, feature validation. Reference this when making product decisions.
- `reference/grocery-notes-research.md` — Academic/behavioral research on grocery shopping and meal planning. Reference for understanding user behavior.
- `docs/technical-research.md` — Our own technical research (LLM capabilities, grocery APIs, cost analysis)

### Design Operating Model — Claude Design (canonical: `docs/design/design-workflow.md`)
- Claude Code = source of truth + build. **Claude Design** (claude.ai/design) = Griffin's visual iteration surface; it reads our design system straight from code. **ONE plain app project for the whole app** (GitHub-connected + `docs/design/PROJECT-CONTEXT.md`); surfaces separated on the Claude Code side under `docs/design/surfaces/<surface>/`.
- Two-way bridge: **Code→Design** = Claude Design's native GitHub connector + PROJECT-CONTEXT. **Design→Code** (round-trip SOLVED via FFOS): `import-from-url` rejects the pasted app URL — use `DesignSync.get_file(projectId parsed from the URL, path="<name>.dc.html")`, extract `content`, save to the surface folder. Never paste the generated `.dc.html`.
- **The gate (do this every time work is visual):** explicitly OFFER Griffin a design pass — with a recommendation, what it buys, and where returns diminish. Never silently skip, never auto-run. New surfaces = strong recommendation; in-pattern additions = lean skip (visual-qa catches drift). Griffin decides.
- Superseded the Figma Make model (2026-07-13). Figma MCP stays registered as an escape hatch only. Full loop, re-sync rule, and the 1F boundary are in `docs/design/design-workflow.md`.

### When to reference research:
- Making any product decision about feature scope or priority → check competitor synthesis
- Designing grocery list features → check grocery-notes-research for behavioral insights
- Choosing AI/integration approach → check technical-research.md
- Questioning whether a feature is validated → competitor synthesis has user sentiment data

---

## Technical Stack (Decided)
- Next.js (App Router) + TypeScript
- tRPC (API-first for multi-client)
- Supabase (Postgres + Auth + Realtime + Storage)
- Drizzle ORM
- shadcn/ui + Tailwind CSS
- LLM: TBD (prototyping on Gemini free tier, benchmarking GPT-4.1-mini / Gemini Flash / Claude)
- Vercel (deployment)

---

## Engineering Rules (Non-Negotiable)

These apply to ALL code. Hooks enforce the critical ones deterministically.

### Before Writing Code
- **Read before write.** Before creating or editing a file, read it AND its directory siblings. Search for existing implementations before creating new utilities/components.
- **Plan multi-file changes.** For changes touching 3+ files, state what you'll touch and why. Use plan mode + ultrathink for architectural decisions.

### While Writing Code
- **All mutations through tRPC.** No direct Drizzle calls from components. No Server Actions for mutations.
- **No duplication.** Search for existing patterns before writing new ones. Extract shared logic at 3+ repetitions.
- **300-line file limit** (non-test files). Split before adding more code.
- **Tests alongside code.** Every tRPC procedure, AI pipeline, and utility gets tests in the same commit.
- **No `any` types.** No `@ts-ignore`. No `as unknown as X`.

### After Writing Code
- **Run the gauntlet:** `npm run lint && npm run typecheck && npm run test:run` (hooks enforce this on commit, but run proactively).
- **Run the E2E suite when your change touches its coverage** (see "E2E test suite" below) and always at a feature/phase wrap.
- **Security self-check on auth/data code:** RLS policy? Zod validation? Service key not in client code?

### Auto-Invoke Rules (Claude does these without being asked)
- **Before any feature touching 3+ files:** Run `/architect` to validate the approach against project architecture.
- **When building UI/flows the E2E suite covers:** run `npm run test:e2e` before wrapping, and EXTEND the specs for the new behavior (a feature isn't done until its mechanics are covered). See "E2E test suite" below.
- **At the end of every build phase (1A, 1B, 1C, etc.):** Run `/review` for a multi-perspective code review AND run the full E2E suite (`npm run test:e2e`).
- **When Griffin corrects your approach:** Propose adding the correction as a permanent rule (compound learning).

### Griffin Invokes Explicitly
- **`/codex-review`** -- Codex second opinion at milestones (M1, M3, M6). Say "run codex review."
- **`/preflight`** -- Manual quality dry-run without committing.

### Everything Else Is Automatic
- **Pre-commit hooks** fire on every commit (no invocation needed)
- **`.claude/rules/`** load when matching files are touched (no invocation needed)
- **CLAUDE.md rules** are loaded every session (no invocation needed)

---

## E2E test suite (Playwright) — when to run it

There is an in-repo Playwright E2E harness (`tests/e2e/`, built Session 17; details in `docs/plans/spike-e2e-testing-harness.md` and `tests/e2e/harness/README.md`). It self-verifies real UI mechanics in a browser — the layer unit tests can't reach.

**Run `npm run test:e2e`** (self-contained: builds + starts its own server on 3102, deterministic AI mock, no OpenAI spend; ~1.5 min. After a build, `E2E_REUSE_BUILD=1 npm run test:e2e` skips the rebuild).

**Run it (without being asked) when:**
- Your change touches code the suite covers, OR
- You're wrapping a feature or closing a build phase, OR
- You touched drawers/sheets, the plan/AI pipeline, auth, or seeding.

**Coverage today:** the **Plan tab** — drawer dismissal (D1-D7), regenerate (RG1-RG5), the modify affordance (M1-M7). `docs/test-plan.md` is the 1:1 catalog. Other tabs (Recipes, Groceries) have no E2E coverage yet, so a change isolated to them won't be caught by this suite — extend the harness as those tabs mature.

**A feature isn't done until its mechanics are in the suite.** When you build new Plan-tab behavior, add/extend the spec in the same session. When a spec surfaces a real product question rather than a bug, mark it `test.fixme` with a comment and flag it for Griffin (don't weaken the assertion to force green).

**Not in the pre-commit hook on purpose:** it needs a build and is minutes-slow, so it's a relevant-change + wrap-time gate, not a per-commit one. The fast gauntlet (lint/typecheck/unit) stays the commit gate.

**Then visual QA (`/visual-qa`):** after mechanics are green, run the visual layer — it captures every Plan state, Claude LOOKS at the screenshots (behavior tests miss "the code says one thing, the screen shows another"), critiques against `docs/design/visual-qa-rubric.md`, and iterates to the bar (0 blockers + 0 high) before Griffin sees it. Layer A (mock) = layout/design; Layer B (real content, `E2E_LIVE_CAPTURE=1`) = content quality (chip phrasing, variety). Full loop in `.claude/commands/visual-qa.md`. So the flow is: **mechanics green → /visual-qa → ux-design-critic taste pass → hand to Griffin for taste.**

**The mechanical/taste split (Griffin's directive):** the harness owns *mechanical* verification (behavior AND now pixels) so Griffin no longer clicks every path or catches basic visual bugs. Use judgment to tell him when a feature is machine-verified and READY for his *functional/taste* review (does it read well, do chips sound like imperatives, does it feel right) — scope his pass to taste, don't hand him a full click script, and don't skip bringing him in.

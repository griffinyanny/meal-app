# Claude Code Quality & Architecture Best Practices

*Comprehensive guide for ensuring Claude Code operates like a senior engineer on production projects. Based on deep research across Reddit, Hacker News, dev blogs, official Anthropic documentation, and real-world production case studies (2025-2026).*

*Created 2026-05-26. Intended for use across any project where Claude Code is the primary engineer.*

---

## Table of Contents

1. [The Core Problem](#the-core-problem)
2. [The Layered Enforcement Model](#the-layered-enforcement-model)
3. [CLAUDE.md Best Practices](#claudemd-best-practices)
4. [File-Type Rules (.claude/rules/)](#file-type-rules)
5. [Hooks (Deterministic Enforcement)](#hooks-deterministic-enforcement)
6. [Custom Commands (Review Workflows)](#custom-commands)
7. [Common Architectural Mistakes Claude Makes](#common-architectural-mistakes)
8. [Multi-Agent Review Workflows](#multi-agent-review-workflows)
9. [Context Management](#context-management)
10. [Compound Engineering (Learning Loop)](#compound-engineering)
11. [Testing as Architecture](#testing-as-architecture)
12. [Non-Functional Requirements](#non-functional-requirements)
13. [Independent Second Opinions (Codex / Other AI)](#independent-second-opinions)
14. [Session Protocol & Cross-Session Context](#session-protocol)
15. [Plan Mode & Architectural Thinking](#plan-mode)
16. [Security Considerations](#security-considerations)
17. [For Non-Engineers Using Claude Code](#for-non-engineers)
18. [Implementation Checklist](#implementation-checklist)
19. [Sources](#sources)

---

## 1. The Core Problem

Claude Code writes functional code. The challenge is getting it to write *architecturally sound* code — code that follows established patterns, reuses existing abstractions, maintains consistency across a growing codebase, and makes the right structural decisions without constant oversight.

**The key insight from the research:** CLAUDE.md rules are advisory. Claude follows them roughly 70-80% of the time. For anything where a single violation matters (committing secrets, breaking existing patterns, skipping tests), you need deterministic enforcement via hooks. The most effective setups use a layered model where different mechanisms handle different levels of criticality.

---

## 2. The Layered Enforcement Model

Four layers, from most to least deterministic:

| Layer | Mechanism | Compliance | Best For |
|-------|-----------|-----------|----------|
| **Hooks** | `.claude/settings.json` hooks | 100% (deterministic) | Critical gates: lint, typecheck, tests before commit |
| **CI/CD** | GitHub Actions / Vercel checks | 100% (deterministic) | Same checks on the server side as a safety net |
| **Rules** | `.claude/rules/` files | ~90% (contextual) | File-type-specific patterns that load on demand |
| **CLAUDE.md** | Project + global instructions | ~70-80% (advisory) | Behavioral guidance, workflow rules, session protocol |

**The principle:** Use the highest-compliance mechanism appropriate for each constraint. Don't put critical constraints in CLAUDE.md alone.

---

## 3. CLAUDE.md Best Practices

### Instruction Budget

The Claude Code system prompt uses roughly 50 instruction "slots." You have approximately 100-150 remaining for your own rules. Total CLAUDE.md content (global + project) should stay under 200 lines of actual instructions. Documentation, file references, and session protocol are less dense than discrete rules.

**If your CLAUDE.md exceeds ~200 lines of instructions, compliance drops sharply.** Move file-type-specific rules to `.claude/rules/` and stack-specific knowledge to `.claude/skills/`.

### Structure: The WHAT/WHY/HOW Framework

Structure CLAUDE.md content in three layers:
- **WHY** — Project purpose, who the user is, what matters
- **WHAT** — Tech stack, constraints, non-negotiables
- **HOW** — Conventions, patterns, workflow rules

If you leave out any of the three, Claude guesses — and guesses wrong.

### Placement Matters

Rules Claude violates most often should go at the **top (first 5 lines) AND bottom (last 5 lines)** of CLAUDE.md. This exploits primacy and recency bias in attention.

### Emphasis Markers Work

`IMPORTANT`, `CRITICAL`, `YOU MUST`, `NEVER` — these actually improve adherence. Confirmed by Anthropic's own documentation. Use them sparingly on the rules that matter most.

### Negative Rules Are Essential

Without explicit "never do X" rules, Claude defaults to the most common pattern in its training data, which may not be yours. Examples:
- "Never use Server Actions for mutations — use tRPC"
- "No `any` types, no `@ts-ignore`"
- "No class components"

### Concrete Over Abstract

"Use 2-space indentation and single quotes" works. "Format code properly" does not. Be specific about what you want.

### Include Build/Test Commands

The single highest-impact thing in CLAUDE.md: tell Claude exactly how to build, lint, typecheck, and test. Example:
```
Build: npm run build
Lint: npm run lint
Typecheck: npm run typecheck
Test: npm run test:run
```

### Document Existing Patterns

Tell Claude where to find things: "When implementing auth, use the existing AuthProvider in `src/lib/auth.ts`." "Shared utilities live in `src/lib/utils.ts`." Without this, Claude creates new implementations instead of reusing existing ones.

### Recommended Engineering Rules for CLAUDE.md

These are the behavioral rules that belong in CLAUDE.md (not hooks, not rules files):

```markdown
## Engineering Rules

### Before Writing Code
- **Read before write.** Before creating or editing a file, read the existing
  file AND its siblings in the same directory. Search for existing implementations
  before creating new utilities/components.
- **Plan multi-file changes.** For changes touching 3+ files, state what you'll
  touch and why before starting. Use plan mode + ultrathink for architectural decisions.

### While Writing Code
- **No duplication.** Search for existing patterns before writing new ones.
  Extract shared logic at 3+ repetitions.
- **300-line file limit** (non-test files). Split before adding more code.
- **Tests alongside code.** Every procedure, pipeline, and utility gets tests
  in the same commit.
- **No `any` types.** No `@ts-ignore`. No `as unknown as X`.

### After Writing Code
- **Run the gauntlet before declaring done:** lint + typecheck + tests.
  Hooks enforce this on commit, but run proactively.

### Compound Learning
- When the user corrects your approach, propose adding the correction as a
  permanent rule in CLAUDE.md or .claude/rules/. Every mistake should only
  happen once.
```

---

## 4. File-Type Rules (.claude/rules/)

### What They Are

The `.claude/rules/` directory contains markdown files with YAML frontmatter that specifies which files they apply to. They load automatically when Claude touches matching file types, and they DON'T count against the CLAUDE.md instruction budget.

### Why They Matter

Instead of bloating CLAUDE.md with rules for every file type (React patterns + API conventions + database rules + test patterns), you put each set of rules in a focused file that only loads when relevant. This keeps context clean and instruction density high.

### Format

```markdown
---
globs: src/components/**/*.tsx
---

# React Component Rules

- Max 300 lines per component. Extract sub-components when exceeded.
- Explicit TypeScript prop types.
- Use cn() from @/lib/utils for class merging.
- No direct database calls in components.
- Loading states must be descriptive, not generic spinners.
- Error states must have fallback UI.
- All interactive elements need aria labels.
```

### Recommended Rule Files

Create one per architectural layer:

1. **React/UI components** — Component patterns, accessibility, state management
2. **API layer** (tRPC routers / Server Actions / API routes) — Auth checks, input validation, error handling
3. **Database/schema** — Migration rules, RLS policies, naming conventions
4. **AI/LLM pipelines** (if applicable) — Prompt hygiene, Zod validation, provider abstraction
5. **Test files** — Testing patterns, what to mock, assertion style

---

## 5. Hooks (Deterministic Enforcement)

### What They Are

Claude Code hooks are configured in `.claude/settings.json` at the project level. They intercept Claude Code tool calls and run shell commands. If a blocking hook exits non-zero, the tool call is prevented.

### The Most Important Hook: Pre-Commit Quality Gate

This single hook catches ~90% of quality issues:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -q 'git commit'; then cd /path/to/project && npm run lint 2>&1 && npm run typecheck 2>&1 && npm run test:run 2>&1; fi; exit 0",
            "blocking": true
          }
        ]
      }
    ]
  }
}
```

**What this does:** Every time Claude runs `git commit`, the hook intercepts and runs lint + typecheck + tests first. If any fail, the commit is blocked and Claude sees the error output.

### Hook Types

- **PreToolUse** — Fires before a tool executes. Access `$TOOL_INPUT` (full JSON) and `$TOOL_INPUT_FILE` (for file-writing tools).
- **PostToolUse** — Fires after a tool executes.
- **blocking: true** — Must exit 0 for the tool call to proceed.
- **blocking: false** — Runs but doesn't prevent the operation. Good for warnings.

### Other Useful Hooks

**File size warning (non-blocking):**
```json
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "file=\"$TOOL_INPUT_FILE\"; if [ -n \"$file\" ] && echo \"$file\" | grep -qE '\\.(ts|tsx)$'; then lines=$(wc -l < \"$file\" 2>/dev/null || echo 0); if [ \"$lines\" -gt 300 ]; then echo \"WARNING: $file is $lines lines (limit: 300).\" >&2; fi; fi; exit 0",
    "blocking": false
  }]
}
```

### Why Not More Hooks

Keep hook count low. Reasons:
- **Performance:** Every hook fires on matching tool calls. Too many slow down development.
- **Fragility:** Shell commands parsing `$TOOL_INPUT` JSON are brittle.
- **Diminishing returns:** The pre-commit gate catches ~90% of issues.
- **Right tool for the job:** Hooks for 100% enforcement. Rules for ~90%. CLAUDE.md for ~80%.

### Hooks vs. Git Hooks (husky/lint-staged)

If Claude Code is the only one writing code (no human engineers committing), Claude Code hooks in `.claude/settings.json` are sufficient. If human engineers also commit, add traditional git hooks (husky + lint-staged) as well. The Claude Code hooks only intercept Claude's own tool calls.

---

## 6. Custom Commands (Review Workflows)

### What They Are

Files in `.claude/commands/` that define custom slash commands. They're markdown files with YAML frontmatter and prompt instructions.

### Recommended Commands

#### `/review` — Multi-Perspective Code Review

Launches 4 parallel sub-reviews using Claude Code's built-in subagent types:
1. **Correctness & Logic** — Logic errors, edge cases, async bugs, state management issues
2. **Security** — Auth gaps, input validation, data exposure, prompt injection
3. **Architecture & Consistency** — Pattern violations, duplication, file organization, naming
4. **Performance & UX** — N+1 queries, missing loading/error states, bundle size

Findings are grouped as CRITICAL / IMPORTANT / SUGGESTIONS / CLEAN. After internal review, optionally run an independent second opinion (Codex, another AI).

Does NOT auto-apply fixes — waits for the user's go-ahead.

**When to invoke:** At the end of every significant feature or build phase. Can be auto-invoked by adding to CLAUDE.md: "At the end of every build phase, run /review."

#### `/preflight` — Quality Dry-Run

Runs all quality checks without committing:
1. Lint (zero warnings)
2. Type check
3. Test suite
4. File size check (find files over 300 lines)
5. Security spot check (grep for common issues)

Reports PASS/FAIL per check with a summary verdict.

#### `/architect` — Pre-Build Architecture Review

For use BEFORE building a feature. Reads the project structure, engineering principles, and any architectural plan, then evaluates proposed changes against:
- API boundary compliance
- File organization
- Duplication risk
- Data model alignment
- Test plan
- Security implications
- Non-functional requirements

Returns APPROVE / APPROVE WITH NOTES / NEEDS CHANGES.

**When to invoke:** Before any feature touching 3+ files. Can be auto-invoked by adding to CLAUDE.md: "Before any feature touching 3+ files, run /architect."

---

## 7. Common Architectural Mistakes Claude Makes

These are the most frequently reported issues. Each one has a specific mitigation.

### Mistake 1: Not Reading Existing Code Before Writing

Claude doesn't automatically explore the codebase for conventions. Without explicit instruction, it writes technically correct but architecturally inconsistent code — using a different error pattern, creating a new utility when one exists, structuring a component differently from its siblings.

**Fix:** Add to CLAUDE.md: "Before modifying any file, read at least 3 related files to understand existing patterns. Before creating any new file, search for existing similar implementations."

### Mistake 2: Code Duplication

Claude doesn't proactively search for existing code to reuse. If utility functions, shared hooks, or base components aren't in the files Claude is currently reading, it creates new ones.

**Fix:** Add to CLAUDE.md: "Before creating any utility function, hook, or helper, search the codebase for existing implementations." Also: document where shared utilities live so Claude knows where to look.

### Mistake 3: Growing Files Into Monoliths

Claude keeps adding to the same file rather than splitting. A component that should be 3 files becomes 800 lines.

**Fix:** Add a 300-line file limit rule. Add a file-size warning hook. Claude will still sometimes exceed this, but the combination of rule + hook catches most cases.

### Mistake 4: Context Pollution

Starting with one task, asking something unrelated, then returning to the first task. Past ~50% context fill, performance degrades. Instructions given early fade as new content pushes them back.

**Fix:** Use `/clear` between unrelated tasks. Use subagents for research. Use `/compact` at ~50% context fill.

### Mistake 5: Ignoring Architectural Instructions

Documented cases of Claude preserving old patterns when explicitly told to use new ones. This happens more when the old pattern has more training data representation.

**Fix:** For truly critical constraints, use hooks (100% enforcement) rather than CLAUDE.md rules (~80%). Repeat critical rules at both the top and bottom of CLAUDE.md.

### Mistake 6: Skipping Non-Functional Requirements

Claude handles functional requirements well but consistently misses: SEO, security hardening, accessibility, performance optimization, error states, loading states, mobile responsiveness.

**Fix:** Include a non-functional requirements checklist in every feature plan template (see Section 12).

### Mistake 7: Over-Engineering

Claude sometimes adds unnecessary abstractions, feature flags, backwards-compatibility shims, or elaborate error handling for scenarios that can't happen.

**Fix:** Add to CLAUDE.md: "Write the minimum code that solves the problem. No features, abstractions, or configs beyond what was asked."

---

## 8. Multi-Agent Review Workflows

### The Research Finding

Single-pass code review (one agent reviewing all code) catches about 50% of actionable issues. Multi-agent review with parallel specialized subagents catches about 75%.

### The 4-Subagent Pattern

Launch 4 subagents in parallel, each examining the same diff from a different perspective:
1. **Logic reviewer** — Correctness, edge cases, race conditions
2. **Security reviewer** — Auth, validation, data exposure
3. **Architecture reviewer** — Pattern consistency, duplication, organization
4. **Performance reviewer** — Queries, rendering, bundle size

A synthesizer combines findings, removes duplicates, and prioritizes.

### Cross-AI Review

The strongest pattern: use a *different* AI model to review Claude's code. OpenAI's Codex CLI, ChatGPT, or Gemini can catch blind spots that come from the same model reviewing its own work. This is because different models have different training biases.

The `/codex-review` command is one implementation: it gathers Claude's diff and sends it to Codex for an independent review.

### Review Cadence

| Trigger | What | Who |
|---------|------|-----|
| Every commit | Pre-commit hooks (lint + typecheck + tests) | Automatic |
| Before multi-file features | `/architect` | Auto-invoke |
| End of build phases | `/review` (multi-agent) | Auto-invoke |
| Major milestones | `/codex-review` (independent AI) | Manual |

---

## 9. Context Management

### The Problem

Claude Code's quality degrades past ~50% context window fill. Instructions given early in the conversation fade. Research and intermediate output flood the context with noise.

### Best Practices

1. **`/compact` at 50% context fill.** Summarizes and frees space. Do this proactively.
2. **`/clear` between unrelated tasks.** Don't let task A's context pollute task B.
3. **Subagents for research.** Delegate investigation to subagents. They run in their own context window and return only the summary. The main conversation stays clean.
4. **Directory-level rules files.** Rules in `.claude/rules/` only load when relevant file types are touched. This is more efficient than putting everything in CLAUDE.md.
5. **Skills for deep knowledge.** `.claude/skills/` files load on-demand when invoked, not every session. Use for stack-specific patterns (e.g., Supabase best practices, tRPC conventions).
6. **Don't mix tasks in one session.** If you need to research something AND implement something, research first (with subagents), then `/clear`, then implement.

---

## 10. Compound Engineering (Learning Loop)

### The Pattern

Plan -> Build -> Review -> Codify. Every correction the user makes becomes a permanent rule.

**How it works:**
1. Claude builds something
2. User corrects: "No, don't do it that way" or "Yes, exactly like that"
3. Claude proposes: "Should I add this as a rule? Here's what I'd write..."
4. If approved, Claude adds it to CLAUDE.md, `.claude/rules/`, or engineering principles
5. The system gets smarter over time. Every mistake only happens once.

### What to Codify Where

| Type of correction | Where to save |
|-------------------|---------------|
| Behavioral principle ("always plan before building") | CLAUDE.md |
| File-type pattern ("components should use cn() for classes") | `.claude/rules/` |
| Project knowledge ("our auth uses middleware X") | Engineering principles doc |
| User preference ("don't summarize at the end of responses") | Memory system |

### Record Success Too

If you only save corrections, Claude grows overly cautious. Also save confirmations: "Yes, the single bundled PR was the right call." "Perfect, keep doing that." This validates approaches that should be repeated.

---

## 11. Testing as Architecture

### Why Testing Matters for AI-Generated Code

Testing isn't just quality assurance — it's an architectural tool. Writing tests forces Claude to think about:
- Interface design (what are the inputs and outputs?)
- Edge cases (what can go wrong?)
- Separation of concerns (can this be tested in isolation?)

Code that's hard to test is usually poorly structured. The test requirement surfaces architectural problems early.

### Testing Strategy

| Layer | What to test | Pattern |
|-------|-------------|---------|
| Pure functions | All edge cases | Unit tests |
| API procedures | Happy path + auth + errors | Integration tests |
| AI pipelines | Valid response, malformed, timeout | Mocked LLM responses |
| System prompts | Content hasn't changed unexpectedly | Snapshot tests |
| Schemas | Valid and invalid inputs | Unit tests |

### What NOT to Test (Yet)

- UI component rendering (until UI stabilizes, then E2E)
- Third-party library internals
- Configuration files

### TDD as Discipline

The strongest pattern from the research: require tests in the same commit as the implementation. Not "we'll add tests later" — later never comes. The pre-commit hook enforces this by running the test suite before every commit.

---

## 12. Non-Functional Requirements

### The Checklist

Claude consistently skips non-functional requirements unless explicitly prompted. Include this checklist in every feature plan:

- [ ] **Auth/Access:** Who can access this? Is it enforced at the database level?
- [ ] **Performance:** Will this be slow with 1000+ items? Pagination? Virtualization?
- [ ] **Accessibility:** Keyboard navigation? Screen reader labels? Color contrast?
- [ ] **Error states:** API failure? Missing data? Network offline?
- [ ] **Loading states:** Descriptive text? Skeleton screens? Streaming?
- [ ] **Mobile:** Does this work on small screens?
- [ ] **Security:** New auth surfaces? User input handling? URL fetching?
- [ ] **Tests:** What tests are needed? Are they in the plan?

---

## 13. Independent Second Opinions (Codex / Other AI)

### Why This Works

Different AI models have different training biases. Claude reviewing its own code misses things a different model catches. The research shows this is one of the most effective quality practices.

### Options

1. **Codex CLI (OpenAI)** — Install via npm. Use as `/codex-review` command that sends diffs to Codex for blind review.
2. **ChatGPT** — Paste architecture docs or key decisions and ask "what's wrong with this?"
3. **Gemini** — Same approach. Different model, different blind spots.

### What to Send for Review

- The diff (for code review)
- Architecture decisions (for architecture review)
- Project-specific constraints (so the reviewer knows what rules to check)

### Enhancement: Architecture-Aware Codex Review

When sending diffs to Codex, include project-specific constraints:
```
Project-specific constraints to verify:
- [Your API boundary rule]
- [Your auth/security rule]
- [Your type safety rule]
- [Your file size rule]
- [Your prompt hygiene rule]
```

This turns a generic code review into an architecture-aware review.

---

## 14. Session Protocol & Cross-Session Context

### The Problem

Every new Claude Code conversation starts with amnesia. Without explicit context restoration, Claude makes decisions that contradict previous sessions.

### Session Protocol

**At the start of every session:**
1. Read project CLAUDE.md
2. Read the "where we left off" document (e.g., `docs/whats-next.md` or `docs/CURRENT_STATE.md`)
3. Read the master plan / architectural plan
4. Skim the recent changelog
5. Summarize understanding before starting work

**During every session:**
1. Commit at every logical checkpoint (not one giant commit at the end)
2. Update the changelog with each significant change
3. Watch context window — suggest fresh session at ~60% fill

**At the end of every session:**
1. Update "where we left off" document with: what's done, what's next, open decisions
2. Update any plans that shifted
3. Final commit with documentation changes

### Document Hierarchy

Two layers, each with a distinct job:
- **`docs/`** = living operational state (what's happening NOW, decisions, open questions)
- **Plans** = strategic roadmap (where we're going, phased approach, architecture)

The plan answers "where are we going." The docs answer "where are we right now." Keep them in their lanes.

### Memory System

Claude Code's memory system (files in `~/.claude/projects/.../memory/`) persists across conversations. Use it for:
- User preferences and working style
- Feedback and corrections (compound learning)
- Project context that isn't derivable from code
- References to external resources

Don't use it for: code patterns (derive from codebase), git history (use git log), debugging solutions (in the code), ephemeral task details.

---

## 15. Plan Mode & Architectural Thinking

### When to Use Plan Mode

**Rule of thumb:** If you can describe the exact diff in one sentence, skip the plan. If you can't, plan first.

Use plan mode for:
- Any change touching 3+ files
- Any new feature or subsystem
- Any architectural decision
- Any refactoring that changes module boundaries

### UltraThink

The `ultrathink` keyword triggers Claude's full thinking budget for complex architecture decisions. Use it when:
- Designing data models
- Choosing between architectural approaches
- Planning multi-phase implementations
- Reviewing security implications

### Plan -> Execute Separation

Anthropic's own teams separate "thinking" from "doing." Plan mode is read-only — Claude analyzes the codebase and generates a plan without modifying files. Then execute the plan in implementation mode. This prevents solving the wrong problem.

---

## 16. Security Considerations

### AI-Generated Code Security Stats

40-62% of AI-generated code contains security flaws (2025-2026 research). The combination of linting, security scanning, and automated testing creates a tight feedback loop.

### Common AI Security Mistakes

1. **Missing auth checks** on new endpoints/procedures
2. **SQL injection** via string interpolation (less common with ORMs, but watch for raw queries)
3. **XSS** via `dangerouslySetInnerHTML` or unescaped user content
4. **SSRF** on URL import features (fetching user-provided URLs without validation)
5. **Secrets in client code** (API keys with wrong prefix)
6. **Prompt injection** (user content interpolated into system prompts)
7. **Excessive logging** (PII or health data in production logs)

### Mitigations

- ESLint catches `no-explicit-any` and some security patterns
- Zod validation on all inputs and AI outputs
- RLS policies on database tables
- SSRF protection on URL fetching (block private IPs, validate domains)
- Prompt hygiene (user content in `user` role only)
- Security sub-review in the `/review` command

---

## 17. For Non-Engineers Using Claude Code

### The Operating Model

As code becomes cheaper to write, deciding *what* to write becomes more valuable. The PM/founder role in an AI-coding setup:
- Define the product (what to build, for whom, why)
- Make architectural decisions (with Claude's recommendation)
- Review outputs (does this match what I asked for?)
- Quality gates (invoke reviews at milestones)
- Course corrections (compound learning)

### The Critical Skill

The critical skill is not writing code but setting up the agents, prompts, and review gates so Claude can write code without constant babysitting. Invest in the infrastructure (hooks, rules, commands, session protocol) before building features.

### Quality Pivots

Sometimes pausing features to improve tests, refactor large files, or add missing infrastructure is more valuable than feature velocity. A production SaaS case study: 468 commits, 695 tests, 25 API endpoints, zero production incidents. The founder's split: 46% human (decisions, architecture, debugging) / 54% Claude (implementation, tests, docs).

### When to Worry

- Claude is creating lots of new files without searching for existing ones
- Files are growing past 300 lines
- The same type of bug keeps appearing
- You're explaining the same correction for the third time (should have been codified after the first)
- Tests are being skipped "to save time"

---

## 18. Implementation Checklist

### For a New Project (before writing any code)

- [ ] Create project CLAUDE.md with: who you are, project purpose, tech stack, session protocol, engineering rules
- [ ] Create `.claude/settings.json` with blocking pre-commit hooks (lint + typecheck + tests)
- [ ] Create `.claude/rules/` with file-type rules for your stack
- [ ] Create `.claude/commands/review.md` (multi-agent review)
- [ ] Create `.claude/commands/preflight.md` (quality dry-run)
- [ ] Create `.claude/commands/architect.md` (pre-build architecture review)
- [ ] Set up ESLint with strict rules (including `no-explicit-any: error`)
- [ ] Set up Prettier for consistent formatting
- [ ] Set up TypeScript with `strict: true`
- [ ] Set up Vitest (or your test runner)
- [ ] Create `.github/workflows/ci.yml` (lint + typecheck + test + build)
- [ ] Create `docs/engineering-principles.md` with full rationale and NFR checklist
- [ ] Create session tracking docs (changelog, current state, decisions, open questions)
- [ ] Update global CLAUDE.md with coding discipline rules

### For an Existing Project (retrofitting)

- [ ] Create `.claude/settings.json` with pre-commit hooks (works immediately if lint/test scripts exist)
- [ ] Create `.claude/rules/` with rules matching your file patterns
- [ ] Add engineering rules section to project CLAUDE.md
- [ ] Add Prettier if missing
- [ ] Identify files over 300 lines and note them for opportunistic refactoring
- [ ] Create `/review` command for milestone reviews

### Ongoing Maintenance

- [ ] Compound learning: codify corrections into rules after every user correction
- [ ] Monthly architecture review: dedicated session for drift, duplication, and debt
- [ ] Review cadence: `/review` at phase boundaries, `/codex-review` at milestones
- [ ] Context hygiene: `/compact` at 50%, `/clear` between tasks, subagents for research

---

## 19. Sources

### Community & Practice

- [Karpathy's CLAUDE.md Rules](https://www.aibuilderclub.com/blog/karpathy-claude-md-rules) — The "four rules" pattern: think before coding, simplicity first, surgical changes, goal-driven execution
- [CLAUDE.md Patterns That Actually Work](https://www.elegantsoftwaresolutions.com/blog/claude-code-mastery-claude-md-patterns) — Instruction budget (~150-200 rules), primacy/recency bias, emphasis markers
- [I Wrote 500 Lines of Rules](https://dev.to/mikeadolan/i-wrote-500-lines-of-rules-for-claude-code-heres-how-i-made-it-actually-follow-them-3c8) — CLAUDE.md is advisory; hooks are deterministic
- [Designing CLAUDE.md Correctly](https://www.obviousworks.ch/en/designing-claude-md-right-the-2026-architecture-that-finally-makes-claude-code-work/) — WHAT/WHY/HOW framework
- [Claude Code Rules: Stop Stuffing One CLAUDE.md](https://medium.com/@richardhightower/claude-code-rules-stop-stuffing-everything-into-one-claude-md-0b3732bca433) — .claude/rules/ directory, file-type scoping
- [4 Ways to Combat Claude's Code Duplication](https://ngof.nikhaldimann.com/p/4-ways-to-combat-claudes-code-duplication) — Anti-duplication strategies
- [From Chaos to Control](https://www.brandoncasci.com/2025/07/30/from-chaos-to-control-teaching-claude-code-consistency.html) — Pattern consistency over pattern perfection

### Production Case Studies

- [Building a Production SaaS with Claude Code](https://medium.com/@romi74371/building-a-production-saas-with-claude-code-468-commits-695-tests-real-lessons-7b8367fa4158) — 468 commits, 695 tests, zero production incidents. 46% human / 54% Claude.
- [Non-Coders Shipping Products](https://www.buildmvpfast.com/blog/non-coders-shipping-products-claude-code-2026) — Peper (Dialed, surf app, App Store), Roman Hauptvogel (production SaaS in 4 weeks)
- [Claude Code for Product Managers](https://every.to/source-code/claude-code-for-product-managers) — PM-as-outcome-engineer model

### Review & Quality

- [9 Parallel AI Agents That Review My Code](https://hamy.xyz/blog/2026-02_code-reviews-claude-subagents) — Multi-subagent review pattern, 75% more actionable findings
- [adamsreview Plugin](https://github.com/adamjgmiller/adamsreview) — Multi-stage code review with regression testing
- [Compound Engineering](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents) — Plan -> Build -> Review -> Codify loop
- [tdd-guard](https://github.com/nizos/tdd-guard) — Automated TDD enforcement

### Hooks & Enforcement

- [Claude Code Hooks: 6 Production Patterns](https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns) — Pre-commit, security scanning, architecture verification
- [10 Best Claude Code Hooks](https://www.ayautomate.com/blog/best-claude-code-hooks) — Hook patterns for production

### Context & Architecture

- [Claude Code for Large Codebases](https://www.datastudios.org/post/claude-code-for-large-codebases-refactoring-debugging-and-project-wide-edits-in-real-engineering) — File size limits, modular architecture
- [Context Engineering with Claude Code](https://www.nathanonn.com/context-engineering-with-claude-code-explained/) — /compact, /clear, subagents, progressive disclosure
- [Sub-Agents in Claude Code](https://www.mindstudio.ai/blog/sub-agents-claude-code-context-management) — Context isolation, research delegation
- [Claude Skills and Subagents](https://towardsdatascience.com/claude-skills-and-subagents-escaping-the-prompt-engineering-hamster-wheel/) — Progressive disclosure via skills
- [Plan Mode in Claude Code](https://codewithmukesh.com/blog/plan-mode-claude-code/) — Plan mode + ultrathink for architecture

### Official

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — Anthropic's official recommendations
- [How Anthropic Teams Use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code) — Separation of research and implementation
- [Claude Code for Existing Large Codebases](https://www.lowcode.agency/blog/claude-code-existing-codebase) — "Read before write" principle

### Security

- [Vibe Coding: What Works, What Breaks](https://www.gianty.com/vibe-coding-what-works-and-what-breaks-for-dev/) — 40-62% of AI code has security flaws; 35 CVEs in March 2026 from AI-generated code
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — Documentation-first approach with specialized skill-agents
- [MakerKit - Claude Code Best Practices](https://makerkit.dev/blog/tutorials/claude-code-best-practices) — "Ship reference code first, then let the agent extend it"

### For Non-Engineers

- [Claude Code for Non-Technical PMs](https://www.news.aakashg.com/p/claude-code-non-technical-pms) — Ask AI to critique your prompt before building
- [RanTheBuilder - Lessons From Real Projects](https://ranthebuilder.cloud/blog/claude-code-best-practices-lessons-from-real-projects/) — Non-functional requirements gap

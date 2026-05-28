---
description: Multi-perspective code review -- run after significant features or at build phase boundaries
---

$ARGUMENTS

You are orchestrating a comprehensive code review. This examines recent changes from multiple expert perspectives to catch issues a single reviewer would miss.

## Step 1: Gather Changes

Determine the scope of the review:
- If $ARGUMENTS specifies files or a scope, use that.
- Otherwise, gather all changes since the last commit on main: `git diff main...HEAD` and `git log main..HEAD --oneline`
- If working tree has uncommitted changes, include those too: `git diff`

## Step 2: Run Parallel Sub-Reviews

Launch these as subagents. Each examines the same diff from a different lens.

### Review 1: Correctness & Logic (code-reviewer subagent)
Focus: Does the code do what it's supposed to?
- Logic errors, off-by-one, incorrect conditionals
- Missing edge cases (null, empty, zero, unexpected types)
- Async bugs (missing await, unhandled rejections, race conditions)
- State management issues (stale closures, missing dependencies in useEffect)

### Review 2: Security (code-reviewer subagent)
Focus: Is the code safe?
- Missing auth checks on tRPC procedures
- RLS policy gaps on new tables
- User input reaching database or AI prompts without Zod validation
- SUPABASE_SERVICE_ROLE_KEY usage (should be server-only)
- dangerouslySetInnerHTML usage
- SSRF risks in URL handling
- Sensitive data in logs or prompts (PII, health data)

### Review 3: Architecture & Consistency (system-architect subagent)
Focus: Does this follow the project's established patterns?
- Direct DB calls outside tRPC (violates API-first contract)
- Components doing business logic (should be in server/trpc/)
- Duplicated code that should be extracted
- Files over 300 lines
- Naming inconsistencies with existing code
- Import patterns that don't match the project

### Review 4: Performance & UX (code-reviewer subagent)
Focus: Will this be fast and pleasant to use?
- N+1 query patterns
- Missing loading/error states in UI
- Large bundle imports that could be lazy-loaded
- Missing React.memo or useMemo on expensive computations
- AI calls without streaming (should stream for user-facing generation)
- Missing optimistic updates on tRPC mutations

## Step 3: Synthesize Findings

Combine all findings into a single report:

**CRITICAL** (must fix before shipping)
- [finding] -- [which review found it] -- [file:line]

**IMPORTANT** (should fix, not blocking)
- [finding] -- [which review found it] -- [file:line]

**SUGGESTIONS** (nice to have)
- [finding] -- [which review found it] -- [file:line]

**CLEAN** (things done well -- call out 2-3 genuinely good patterns)

## Step 4: Codex Second Opinion

After the internal review, offer: "Internal review complete. Want me to also run /codex-review for an independent Codex second opinion?"

## Step 5: Action Plan

For each CRITICAL and IMPORTANT finding, suggest a specific fix. Do NOT auto-apply. Wait for Griffin to say which ones to address.

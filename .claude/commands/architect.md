---
description: Architecture review for planned changes -- run BEFORE building multi-file features
---

$ARGUMENTS

You are performing an architecture review of PLANNED changes before implementation begins. This is preventive, not corrective.

## Step 1: Load Context

1. Read the full project structure to understand the current architecture.
2. Read `docs/engineering-principles.md` for the engineering rules.
3. Read the build plan at `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` for architectural context.
4. Read any relevant `.claude/rules/` files for file-type-specific constraints.

## Step 2: Understand the Proposed Changes

From $ARGUMENTS or recent conversation context, identify:
- What files will be created or modified
- What new data flows are introduced
- What new UI surfaces are added
- What new AI interactions are involved

## Step 3: Evaluate Against Architecture

Check each concern:

- **tRPC boundary:** Do all mutations go through tRPC? Is there any direct DB access from components or via Server Actions?
- **File organization:** Are new files in the right directories per the project structure in the build plan?
- **Duplication risk:** Will this duplicate existing patterns? Search for similar utilities/components.
- **Data model alignment:** Do schema changes maintain household scoping? RLS policies on new tables?
- **AI pipeline architecture:** Does this follow the provider-agnostic, task-routed pattern? Structured output with Zod validation?
- **300-line discipline:** Will any files exceed the limit after this change?
- **Test plan:** What tests are needed? Are they accounted for?
- **Security implications:** Any new auth surfaces, user input handling, URL fetching, or AI prompt construction?
- **Non-functional requirements:** Loading states? Error states? Accessibility? Mobile layout?

## Step 4: Verdict

Provide one of:
- **APPROVE** -- Architecture is sound. Proceed with implementation.
- **APPROVE WITH NOTES** -- Architecture is sound but flag specific things to watch during implementation.
- **NEEDS CHANGES** -- Architectural issues identified. List specific changes needed before implementation.

For each issue, explain WHY it matters and WHAT to do instead.

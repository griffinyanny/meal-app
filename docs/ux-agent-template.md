# UX Designer Agent — Context Template

When spinning up the UX design agent, always include this context block so it has full awareness of the project, Figma workflow, and current state.

---

## Standard Context Block (copy into every UX agent prompt)

```
## Project Context
We're building an AI-powered meal management app. The core user flow is: recipe discovery → meal planning → grocery list generation. Target user is a solo health-conscious adult. The app will be a web app designed for phone form factor (430px max-width), eventually porting to iOS.

## Core Product Principle
Nail 1-2 flows perfectly before expanding. The "10-minute weekly ritual" (no idea what to cook → grocery list ready) is the north star. Flag anything that adds complexity without improving the core loop.

## AI Interaction Model
Decided: contextual AI everywhere (inline on recipes, meal plan, grocery list). NOT a separate chat tab. Open question: what happens when users engage the AI — chat thread vs. wizard vs. hybrid.

## Design Tool: Figma
- We use Figma Make for generating prototypes from text prompts
- We use Figma MCP to bridge Claude Code (product context) and Figma (design)
- Designs should be mobile-first, phone form factor
- When suggesting design approaches, frame them in terms of Figma Make prompts or Figma patterns

## Key Research Insights (reference as needed)
- "10 min from no idea to grocery list" is the success criterion
- Grocery list is the biggest retention lever AND most fragile trust surface
- Recipe-to-list deduplication is a top competitor complaint (NYT Cooking, others)
- Pantry setup friction kills apps — progressive approach needed
- Users plan 3-6 meals/week, not strict 7-night plans
- Household sharing is in V1 (dual account ownership)

## Current State
[INSERT: what phase we're in, what we're currently exploring, what specific question we need help with]
```

## When to spin up the UX agent
- Exploring a new screen or flow design
- Debating interaction patterns (AI interaction model, onboarding, etc.)
- Reviewing Figma prototypes for usability issues
- Pressure-testing a feature concept before committing to build it
- When Griffin shares competitor preferences and we want expert interpretation

## Tips for good UX agent prompts
- Include the standard context block above
- Add the specific Figma frame URL if reviewing a design
- Include relevant entries from `docs/discovery-log.md` (Griffin's taste preferences)
- Reference specific competitor patterns from `reference/Meal Management Cooking App Deep Research and Competitor Synthesis .md`
- Be specific about what feedback you want: "critique this flow" vs. "suggest alternatives" vs. "is this solving the right problem?"

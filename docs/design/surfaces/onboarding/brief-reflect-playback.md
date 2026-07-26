# Onboarding — the reflect playback (Pass 3, targeted)

> **Status: TO GENERATE.** One direction, one screen. The rest of the onboarding interview is
> LOCKED (see `brief.md`, direction 1D) and is not in scope here. Read `../../PROJECT-CONTEXT.md`
> and `brief.md` before generating; everything in `brief.md`'s SETTLED list still binds.

**Created:** 2026-07-26 (Session 39) · **Why:** Griffin's taste pass. The reflect screen is the
moment the interview justifies itself, and today it reads as a form played back rather than a chef
who was listening.

## The screen

The **second-to-last** screen of the first-run interview. The user has just answered four core
questions (household, diet, allergies, weeknight time) and optionally up to five more. This screen
is where the chef says what it heard and what it's going to do about it, before handing off into
the first plan.

It has three jobs, in this order of importance:
1. **Show a point of view.** The chef reacts like a cook, not a confirmation dialog.
2. **Play back what was captured, so that answering felt worth it.** This is the job the current
   build does worst.
3. **Make the safety recap unmissable.** Allergies are the one thing that must never be scanned past.

## The problem to solve (this is the whole brief)

The current screen renders the playback as a single flat sentence in schema order:

> Cooking for 2 adults, pescatarian, 30 minutes on a weeknight.

Three things are wrong with it:
- **It reads identically whether you answered 4 questions or 9.** Someone who opted into the deep
  round and told the chef about heat, proteins, cuisines and how they cook gets the same three-clause
  sentence as someone who declined it. The reward for going deeper is invisible.
- **It's in schema order, not human order.** Household, then diet, then time, because that's how the
  columns are laid out.
- **It sits inside the same card as the opinion**, so the receipt and the point of view compete for
  the same slot and the receipt wins on visual weight.

**The design question: how does this screen play back what the chef captured so it reads as
personalized and earned?** Specifically: it should feel materially richer for a user who answered
more, and it should make each captured thing feel like it will change something about dinner.

## What the chef actually holds at this point

Design against real shapes. A maximal user has all of these; a minimum user (core only, all skipped)
has almost none, and the screen still has to work.

**Always present or near-always:**
- Household: `2 adults`, or `2 adults and 1 baby (6 to 12 months)`, or `2 adults and 2 children`
- Diet: `pescatarian` / `vegan` / `no restrictions` / etc.
- Allergies and avoids: `shellfish (allergy)`, `peanuts (allergy)`, `mushrooms`
- Weeknight ceiling: `30 minutes`

**Present only if the user opted into the deep round (0 to 5 of these):**
- Heat: `likes real heat, don't hold back`
- Proteins they want more of: `fish, tofu`
- Cuisines: `Thai, Japanese`
- How they cook / comfort with complexity: `cooks most nights, comfortable with technique`
- Working toward: `more vegetables`, `keeping costs down`, `meals the kids eat`
- Leftovers: `plan for them, they cover lunch`
- Shopping: `once a week, one big run`

**The opinion line** the chef leads with, which is generated from the above. Examples of the register:
- "There'll be chili crisp on the table, and I'll actually season things."
- "Half an hour is plenty. I'm thinking a hot pan and something that goes sweet at the edges."
- "I'll build dinners that come apart easily, so the little one eats a version of what you eat."

## OPEN — iterate here

- **The playback's form.** A list, a set of chips, a short paragraph in the chef's voice, a grouped
  card, something that visibly grows. Open.
- **How richness reads.** What does this screen look like for a 4-answer user versus a 9-answer user,
  and how is the difference felt without shaming the person who answered less? Show **both** states.
- **The relationship between the opinion and the playback.** Same card, separate blocks, opinion as a
  header over the playback. Open.
- **Whether captured items carry any indication of what they change** ("30 minutes" → affects every
  weeknight; "shellfish" → affects everything). Optional, and easy to overdo.
- **Where "Change any of it anytime in You" lives**, and whether it needs to be that explicit.
- Whether the deep-round answers are visually distinct from the core four, or all one set.

## SETTLED — don't touch

- Everything in `brief.md`'s SETTLED list: dark only, 430px, PROJECT-CONTEXT tokens and glass, lucide
  icons, eyebrow all-caps only, chef's voice, no emoji, no confetti, **no em dashes**.
- **The safety recap keeps the red weight and the `allergy` sub-label**, exactly as the You tab renders
  it. Same objects, same vocabulary. It may move; it may not soften.
- **The chef presence** (ember mark + `HERE'S WHAT I'M THINKING` eyebrow) stays.
- **One full-width primary CTA at the bottom: "Plan my first week."** This screen hands off into the
  plan and is never a dead end.
- **No editing on this screen.** Corrections happen by going back or in the You tab. This is a
  playback, and adding controls turns it into the form it's trying not to be.
- The blue-for-actions / amber-for-chef split is provisional and gets locked in 1F. Don't re-litigate.

## States to generate

1. **Core only** — the most common completion. 4 answers, deep round declined. This is the state that
   must not feel thin.
2. **Fully engaged** — 4 core + 5 deep. The state that proves going deeper was worth it.
3. **Skipped almost everything** — household answered, everything else passed. The chef has nearly
   nothing and still has to sound like it's looking forward to cooking.

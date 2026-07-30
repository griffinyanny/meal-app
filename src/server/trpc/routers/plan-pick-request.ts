// The sentence a pick becomes.
//
// `plan.pick` has no free-text input — the person tapped recipes, they did not
// type. So something has to author the request the chef answers, and it is worth
// being deliberate about: this text is the difference between "put this on
// Thursday" (a scheduler, which the ledger says this is not) and "here is what I
// want to cook, you work out the week" (a constraint, which it is).
//
// Pure and separately testable, because the wording IS the behaviour here.
import type { PickInput } from "@/server/ai/tasks/plan-picks";

// The ceiling lives in lib/ so the picker and this validator cannot disagree.
export { MAX_PICKS_PER_ASK } from "@/lib/plan/pick-limits";

/** Oxford-free list: "the carbonara", "the carbonara and the lamb", "a, b and c". */
function joinTitles(titles: string[]): string {
  if (titles.length === 1) return titles[0]!;
  return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
}

export function buildPickRequest(
  picks: PickInput[],
  replacingDayOffset?: number | null
): string {
  const titles = joinTitles(picks.map((p) => p.title));
  const one = picks.length === 1;

  // WHO CHOOSES THE NIGHT DEPENDS ON HOW THE PICKER WAS OPENED, and the frames
  // are explicit about it:
  //
  //   `3b` (intent screen) — the caption reads "The chef picks the nights."
  //   `3e` (from a meal)   — the primary reads "Put it on Thursday."
  //
  // Tapping Thursday's dinner and then being told the chef will decide would
  // make the primary a lie, so a named day is honoured rather than treated as a
  // hint. §B's "the chef answers with a night" governs the invocations where no
  // night was named — the intent screen and `Add to this week` — and the chef
  // still owns the REST of the week in both cases.
  //
  // Stated as a Day N offset because that is the day vocabulary the modify
  // prompt already speaks (`<current_plan>` is a list of "Day N: Title"). The
  // weekday-name rule that fixed BUG-031 governs what the chef WRITES BACK to
  // the user, not what we hand it; this prompt carries no day map to name days
  // from.
  if (replacingDayOffset != null) {
    return (
      `Put ${titles} on Day ${replacingDayOffset}, replacing what's planned there — ` +
      `${one ? "it's" : "they're"} from my own recipes. ` +
      `Rebuild the rest of the week around ${one ? "it" : "them"} so the shop still works.`
    );
  }

  return (
    `Work ${titles} into this week — ${one ? "it's" : "they're"} from my own recipes. ` +
    `You choose which night${one ? "" : "s"}, and rebuild the rest of the week around ${one ? "it" : "them"} so the shop still works.`
  );
}

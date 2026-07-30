// How many recipes one ask may carry (Phase 1E.5 · W8).
//
// Lives in lib/ because BOTH sides need it and they must not disagree: the
// picker stops selecting at this number, and `plan.pick` validates against it.
// A client that let you select a fifth would meet a Zod rejection surfaced as
// "That didn't take — try again?", which is a lie about what happened.
//
// §B's real answer to too many picks is a CONVERSATION (frame `3m`): a
// pre-selected recommendation and its alternative, with the chef giving a
// cooking reason rather than a capacity one. That is a separate screen and is
// deferred (see idea-backlog). Until it exists, the ceiling is stated plainly at
// the point it bites rather than enforced silently.
export const MAX_PICKS_PER_ASK = 4;

// The ceiling on a whole WEEK's picks, including any carried across a
// regenerate. Past a pick a night the person is writing the week rather than
// asking for one.
export const MAX_PICKS_PER_WEEK = 7;

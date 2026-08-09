// The picks block (Phase 1E.5 · W8/W9) — the one place a chosen recipe becomes
// prompt text, and the one place a model-supplied reference becomes a database id.
//
// A CHOSEN RECIPE IS A CONSTRAINT ON THE CHEF, NOT A SCHEDULER (ledger §B). The
// chef still picks the night, builds the rest of the week around it, shops for it
// and spends its leftovers. So this block does not tell the model where anything
// goes — it tells it what is fixed and what it may not touch.
import { fence } from "@/server/ai/prompts/fence";
import type { ValidatedMeal } from "./plan-types";

export interface PickInput {
  /** The library recipe's real id. NEVER put this in a prompt. */
  id: string;
  title: string;
  /** What the recipe itself serves — the input to build dependency 2's scaling. */
  servings: number | null;
  totalTimeMinutes: number | null;
}

/**
 * "3 hr", "1 hr 35 min", "40 min" — the way a cook says it, not `180 min`.
 *
 * Mirrors `rail-helpers.formatDuration`, and deliberately so: the model reads
 * this and writes rationales in the vocabulary it was given, so handing it raw
 * minutes invites "a 180-minute braise" onto a card the rest of the surface
 * would render as "3 hr". Same class as BUG-031, where internal vocabulary
 * (`day 0`) reached a user-facing string because the prompt supplied it.
 */
function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/**
 * Render the picks as `[1] …` lines the model can point back at.
 *
 * The numbering is the ID safety: the model sees ordinals, returns `pickedRef`,
 * and `resolvePickedRecipeId` maps that back against the same array. There is no
 * path by which a hallucinated string becomes a recipe id.
 */
export function buildPicksBlock(
  picks: PickInput[],
  householdSize: number | undefined,
  /**
   * True when the request already names the night (`3e` — the picker opened from
   * a specific meal, whose primary reads "Put it on Thursday"). The chef still
   * owns the rest of the week; it just does not get to move the one night the
   * person pointed at.
   */
  nightNamed = false
): string | null {
  if (picks.length === 0) return null;

  const lines = picks.map((p, i) => {
    const facts = [
      p.totalTimeMinutes ? humanDuration(p.totalTimeMinutes) : null,
      p.servings ? `the recipe serves ${p.servings}` : null,
    ].filter(Boolean);
    return `[${i + 1}] ${p.title}${facts.length ? ` (${facts.join(", ")})` : ""}`;
  });

  const one = picks.length === 1;
  // SERVINGS SCALING IS A GENERATION TASK, NOT ARITHMETIC (build dependency 2).
  // The chef returns the scaled number on the meal, in its own voice, once — a
  // client-side multiply would be a number nobody said, sitting in a surface
  // whose entire premise is that a person is talking to you.
  const scaling =
    householdSize != null
      ? `- You are cooking for ${householdSize}. Where a recipe serves a different number, set that meal's \`servings\` to what YOU are cooking, and say the change once in your line for that night. Never twice, and never as a bare number with no sentence around it.`
      : null;

  return [
    // Fenced: a pick's title is a library recipe's title, which on an imported
    // recipe originates from a third-party web page (fence.ts).
    fence("picked_recipes", lines.join("\n")),
    ``,
    `The person chose ${one ? "this recipe" : "these recipes"} out of their own library. That is a constraint on you, not a schedule:`,
    nightNamed
      ? `- The night is already chosen — put ${one ? "it" : "them"} exactly where the request says. Your line for that night argues the PLACEMENT — why it works there — never the dish. They already decided the dish.`
      : `- YOU choose which night ${one ? "it" : "each one"} lands on, and your line for that night argues the PLACEMENT — why this night — never the dish. They already decided the dish.`,
    `- Do not rewrite, rename, substitute or "improve" a picked recipe. Keep the title exactly as written above.`,
    `- Build the rest of the week around ${one ? "it" : "them"}: shop once, and spend ${one ? "its" : "their"} leftovers.`,
    `- On the meal that IS a picked recipe, set \`pickedRef\` to its bracketed number. On every other meal set \`pickedRef\` to null.`,
    scaling,
    // §B's "the boundary is STATED, not enforced silently" is NO LONGER the
    // model's job (BUG-041, S48). Two live rounds asked for the sentence — the
    // second with both real fields named — and got it zero times: a style
    // clause competing with six operational instructions loses (BUG-033's
    // precedent, third instance). The boundary is a fixed product promise, so
    // the picked row renders it as product copy (`meal-row.tsx`), which also
    // makes it deterministic — the one thing a guarantee has to be.
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Map a model-returned `pickedRef` back to a real recipe id.
 *
 * Returns null for anything that is not a live 1-based index into the picks we
 * actually sent — which covers a hallucinated number, an off-by-one, and a ref
 * on a week that had no picks at all.
 */
export function resolvePickedRecipeId(
  pickedRef: number | null,
  picks: PickInput[]
): string | null {
  if (pickedRef == null || !Number.isInteger(pickedRef)) return null;
  if (pickedRef < 1 || pickedRef > picks.length) return null;
  return picks[pickedRef - 1]!.id;
}

/**
 * One picked recipe per night, at most.
 *
 * The model is asked for a set of nights, not a mapping, so nothing stops it
 * naming the same pick twice — and two slots pointing at one library recipe
 * would shop for it twice and render `PICKED` on a night the person never
 * chose. First occurrence wins; the duplicate keeps its meal and loses only its
 * provenance, because the food is still a real dinner.
 */
export function dedupePickedRefs(meals: ValidatedMeal[]): ValidatedMeal[] {
  const seen = new Set<number>();
  return meals.map((meal) => {
    if (meal.pickedRef == null) return meal;
    if (seen.has(meal.pickedRef)) return { ...meal, pickedRef: null };
    seen.add(meal.pickedRef);
    return meal;
  });
}

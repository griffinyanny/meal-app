// "What I caught" — turning the diff user.talk just applied into the short
// labels the interview's tray shows (Phase 1E, feature #4).
//
// The locked design is explicit that the tray lists what the user's own words
// SURFACED, item by item, and that it must not restate what the tappable
// answers already cover. Showing the chef's whole reply sentence instead (the
// first build) fails both halves: it reads as a chat bubble wearing a chip, and
// it repeats the pill sitting directly above it.
//
// Pure and structural on purpose: the router owns the diff, this owns the
// wording, and neither needs the other's imports.
import { type DietaryFramework, isDietaryFramework } from "@/lib/diet";

export interface PreferenceSnapshot {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  cuisinePreferences: string[];
  householdSize: number;
  maxCookTimeWeeknight: number;
  maxCookTimeWeekend: number;
}

// ⚠️ Typed by the domain, not by `string` (BUG-044). These are the UI labels —
// the same words the onboarding chips wear — and are deliberately a different
// vocabulary from `synthesize.ts`'s chef-voice fragments. Both must cover the
// domain; only the type can enforce that.
const DIET_LABEL: Record<DietaryFramework, string> = {
  omnivore: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  keto: "Keto",
  paleo: "Paleo",
  mediterranean: "Mediterranean",
  other: "Something else",
};

function added(before: string[], after: string[] | undefined): string[] {
  if (!after) return [];
  const seen = new Set(before.map((b) => b.toLowerCase()));
  return after.filter((a) => !seen.has(a.toLowerCase()));
}

// Which typed fields a message SPOKE TO, read off the ops rather than off the
// diff. The two differ in a way that matters: setting a field to the value it
// already holds produces no diff, and `dietary_framework` defaults to
// "omnivore", so "actually, we're not pescatarian" — a real correction, said
// out loud — would otherwise register as nothing happening and the screen would
// keep the answer the user had just retracted.
const FIELD_BY_OP: Record<string, keyof PreferenceSnapshot> = {
  set_diet: "dietaryFramework",
  add_avoid: "restrictions",
  remove_avoid: "restrictions",
  add_dislike: "dislikes",
  remove_dislike: "dislikes",
  add_cuisine: "cuisinePreferences",
  remove_cuisine: "cuisinePreferences",
  set_household: "householdSize",
  set_weeknight: "maxCookTimeWeeknight",
  set_weekend: "maxCookTimeWeekend",
};

export function fieldsTouchedBy(ops: Array<{ kind: string }>): string[] {
  const fields = new Set<string>();
  for (const op of ops) {
    const field = FIELD_BY_OP[op.kind];
    if (field) fields.add(field);
  }
  return [...fields];
}

export function describeCaught(
  before: PreferenceSnapshot,
  after: Partial<PreferenceSnapshot>,
  remembered: string[]
): string[] {
  const labels: string[] = [];

  // ⚠️ Drops rather than echoes an unrecognised framework — BUG-013's fix,
  // applied to the sibling it did not reach. This one runs SERVER-SIDE (the
  // user-talk router imports `describeCaught`), so `?? rawValue` here was the
  // same echo one door over. Not exploitable today (the talk path validates
  // `set_diet` against the same list before it gets here), which is exactly why
  // it survived being looked at once.
  if (
    after.dietaryFramework &&
    after.dietaryFramework !== before.dietaryFramework &&
    isDietaryFramework(after.dietaryFramework)
  ) {
    labels.push(DIET_LABEL[after.dietaryFramework]);
  }
  // Avoids keep their "(allergy)" marker: on the safety turn that marker is the
  // whole point of the confirmation.
  for (const r of added(before.restrictions, after.restrictions)) labels.push(`No ${r}`);
  for (const d of added(before.dislikes, after.dislikes)) labels.push(`No ${d}`);
  for (const c of added(before.cuisinePreferences, after.cuisinePreferences)) labels.push(c);

  if (after.householdSize !== undefined && after.householdSize !== before.householdSize) {
    labels.push(`${after.householdSize} servings`);
  }
  if (
    after.maxCookTimeWeeknight !== undefined &&
    after.maxCookTimeWeeknight !== before.maxCookTimeWeeknight
  ) {
    labels.push(`Under ${after.maxCookTimeWeeknight} min`);
  }
  if (
    after.maxCookTimeWeekend !== undefined &&
    after.maxCookTimeWeekend !== before.maxCookTimeWeekend
  ) {
    labels.push(`Weekends under ${after.maxCookTimeWeekend} min`);
  }

  // Free-form nuance the typed fields can't hold ("we do Taco Tuesday") is the
  // other half of what the tray is for.
  for (const m of remembered) labels.push(m);

  return labels;
}

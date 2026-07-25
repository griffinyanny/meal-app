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

export interface PreferenceSnapshot {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  cuisinePreferences: string[];
  householdSize: number;
  maxCookTimeWeeknight: number;
  maxCookTimeWeekend: number;
}

const DIET_LABEL: Record<string, string> = {
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

export function describeCaught(
  before: PreferenceSnapshot,
  after: Partial<PreferenceSnapshot>,
  remembered: string[]
): string[] {
  const labels: string[] = [];

  if (after.dietaryFramework && after.dietaryFramework !== before.dietaryFramework) {
    labels.push(DIET_LABEL[after.dietaryFramework] ?? after.dietaryFramework);
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

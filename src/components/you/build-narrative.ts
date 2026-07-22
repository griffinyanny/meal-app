import type { RouterOutputs } from "@/lib/trpc";

export type Preferences = RouterOutputs["user"]["preferences"];

// Display defaults when no user_preferences row exists yet — the chef still has a
// sensible baseline to narrate and edit against.
export const PREFERENCE_DEFAULTS = {
  dietaryFramework: "omnivore",
  restrictions: [] as string[],
  dislikes: [] as string[],
  householdSize: 2,
  maxCookTimeWeeknight: 45,
  maxCookTimeWeekend: 90,
  cuisinePreferences: [] as string[],
};

// Preferences resolved to concrete display values (defaults filled in) — what the
// cards, editors, and narrative all render against.
export interface DisplayPreferences {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  householdSize: number;
  maxCookTimeWeeknight: number;
  maxCookTimeWeekend: number;
  cuisinePreferences: string[];
}

export function resolvePreferences(prefs: Preferences): DisplayPreferences {
  return {
    dietaryFramework: prefs?.dietaryFramework ?? PREFERENCE_DEFAULTS.dietaryFramework,
    restrictions: (prefs?.restrictions as string[] | null) ?? [],
    dislikes: (prefs?.dislikes as string[] | null) ?? [],
    householdSize: prefs?.householdSize ?? PREFERENCE_DEFAULTS.householdSize,
    maxCookTimeWeeknight:
      prefs?.maxCookTimeWeeknight ?? PREFERENCE_DEFAULTS.maxCookTimeWeeknight,
    maxCookTimeWeekend: prefs?.maxCookTimeWeekend ?? PREFERENCE_DEFAULTS.maxCookTimeWeekend,
    cuisinePreferences:
      (prefs?.cuisinePreferences as string[] | null) ?? PREFERENCE_DEFAULTS.cuisinePreferences,
  };
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten",
];

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

// Oxford-style join: [] → "", [a] → "a", [a,b] → "a and b", [a,b,c] → "a, b and c".
export function joinList(items: string[]): string {
  const xs = items.map((x) => x.trim()).filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

// The chef's prose read of the cook, built from real preference data (never
// lorem). Returning users get the full narrative; a new user (no memory yet) gets
// the honest "here's the little I know" version.
export function buildNarrative(prefs: Preferences, isNew: boolean): string {
  const size = prefs?.householdSize ?? PREFERENCE_DEFAULTS.householdSize;
  const diet = prefs?.dietaryFramework ?? PREFERENCE_DEFAULTS.dietaryFramework;
  const weeknight = prefs?.maxCookTimeWeeknight ?? PREFERENCE_DEFAULTS.maxCookTimeWeeknight;
  const cuisines =
    (prefs?.cuisinePreferences as string[] | null) ?? PREFERENCE_DEFAULTS.cuisinePreferences;

  if (isNew) {
    return `Here's the little I know so far: cooking for ${numberWord(size)}, ${diet}, keeping weeknights under ${weeknight} minutes. Enough to plan your first week — I'll learn the rest as we cook.`;
  }

  const dietPhrase = diet && diet !== "omnivore" ? `all ${diet}, ` : "";
  let s = `I'm cooking for ${numberWord(size)}, ${dietPhrase}keeping weeknights under ${weeknight} minutes and giving weekends room to breathe.`;
  if (cuisines.length > 0) {
    s += ` You lean ${joinList(cuisines)}.`;
  }
  return s;
}

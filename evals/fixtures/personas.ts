// Fixture households the eval cases plan for. All fictional.
//
// Each persona carries the fields the AI tasks actually accept, plus a
// `forbidden` list used by the restriction checks.
//
// THE PATTERNS EXCLUDE SUBSTITUTES ON PURPOSE, and the first version of this file
// did not — which the very first real run caught. A plain search for "milk"
// matched "coconut milk" and failed a dairy-free case where the model had
// correctly produced a dairy-free dish. A safety check that cries wolf is worse
// than no check, because the first thing anyone does with a noisy gate is stop
// reading it.
//
// So these stay CONSERVATIVE: only text that is unambiguously a violation. The
// judgement calls ("does this soy sauce contain gluten?") belong to the judge,
// which can reason about them, rather than to a regex that would be confidently
// wrong.
import type { PreferencesTalkSnapshot } from "@/server/ai/prompts/preferences-talk";

export interface Persona {
  key: string;
  label: string;
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  householdSize?: number;
  maxCookTimeMinutes?: number;
  memories?: string[];
  /** Patterns that must never match the output for this persona. */
  forbidden: RegExp[];
}

/** Plant-based versions of a restricted ingredient are the point, not a violation. */
const PLANT_MILK = "coconut |almond |oat |soy |cashew |rice |hemp |nut |pea ";
const NUT_BUTTER = "peanut |almond |cashew |cocoa |apple |shea |sun|nut ";
const NOT_WHEAT = "gluten-free |gluten free |rice |chickpea |lentil |corn |quinoa |brown rice ";
const MEAT_SUBSTITUTE = "vegan |vegetarian |plant-based |mushroom |tempeh |tofu |soy |coconut ";

export const SOLO_VEGETARIAN: Persona = {
  key: "solo-vegetarian",
  label: "Vegetarian, cooking for one, shellfish allergy",
  dietaryFramework: "vegetarian",
  restrictions: ["shellfish (allergy)"],
  dislikedFoods: ["mushrooms"],
  householdSize: 1,
  maxCookTimeMinutes: 30,
  forbidden: [
    new RegExp(`(?<!${MEAT_SUBSTITUTE})\\bbeef\\b`, "i"),
    new RegExp(`(?<!${MEAT_SUBSTITUTE})\\bpork\\b`, "i"),
    new RegExp(`(?<!${MEAT_SUBSTITUTE})\\bchicken\\b`, "i"),
    new RegExp(`(?<!${MEAT_SUBSTITUTE})\\bbacon\\b`, "i"),
    new RegExp(`(?<!${MEAT_SUBSTITUTE})\\bsausages?\\b`, "i"),
    /\bshrimp\b/i,
    /\bsalmon\b/i,
    /\banchov(y|ies)\b/i,
    /\bprosciutto\b/i,
  ],
};

export const FAMILY_OF_FOUR: Persona = {
  key: "family-of-4",
  label: "Omnivore family of four, weeknight ceiling",
  dietaryFramework: "omnivore",
  restrictions: [],
  dislikedFoods: ["olives"],
  householdSize: 4,
  maxCookTimeMinutes: 45,
  memories: ["Does Taco Tuesday most weeks.", "Eases off heavy cream sauces."],
  forbidden: [/\bolive tapenade\b/i],
};

export const GLUTEN_FREE: Persona = {
  key: "gluten-free-allergy",
  label: "Coeliac household, gluten is medical",
  dietaryFramework: "omnivore",
  restrictions: ["gluten (allergy)"],
  dislikedFoods: [],
  householdSize: 2,
  maxCookTimeMinutes: 45,
  // Wheat words only, and only where a gluten-free version of the same word does
  // not exist. "Soy sauce" is a real gluten risk but an ambiguous string, so it
  // is the judge's call rather than a hard failure.
  forbidden: [
    /\ball-purpose flour\b/i,
    /\bwheat flour\b/i,
    new RegExp(`(?<!${NOT_WHEAT})\\bpasta\\b`, "i"),
    new RegExp(`(?<!${NOT_WHEAT})\\bbread ?crumbs\\b`, "i"),
    /\bpanko\b/i,
    /\bcouscous\b/i,
    /\bseitan\b/i,
  ],
};

export const DAIRY_FREE: Persona = {
  key: "dairy-allergy",
  label: "Dairy allergy, otherwise unrestricted",
  dietaryFramework: "omnivore",
  restrictions: ["dairy (allergy)"],
  dislikedFoods: [],
  householdSize: 2,
  maxCookTimeMinutes: 45,
  // Coconut milk, almond milk and nut butters are how a dairy-free recipe gets
  // made, so matching them would fail exactly the outputs we want.
  forbidden: [
    /\bheavy cream\b/i,
    /\bcream cheese\b/i,
    /\bparmesan\b/i,
    /\bmozzarella\b/i,
    new RegExp(`(?<!${PLANT_MILK})\\bmilk\\b`, "i"),
    new RegExp(`(?<!${NUT_BUTTER})\\bbutter\\b`, "i"),
  ],
};

export const UNCONSTRAINED: Persona = {
  key: "unconstrained",
  label: "No stated constraints",
  householdSize: 2,
  forbidden: [],
};

/** The shape the generation tasks accept, spread into their inputs. */
export function chefContextFor(persona: Persona) {
  return {
    dietaryFramework: persona.dietaryFramework,
    restrictions: persona.restrictions,
    dislikedFoods: persona.dislikedFoods,
    householdSize: persona.householdSize,
    maxCookTimeMinutes: persona.maxCookTimeMinutes,
    memories: persona.memories,
  };
}

// A WEDNESDAY, on purpose. A week that starts on Monday hides an entire class of
// defect: the model reasons in weekday names while the app reasons in day
// offsets, and every off-by-a-weekday bug looks correct when offset 0 happens to
// be Monday anyway.
export const WEEK_START = "2026-09-09";

export const WEEKDAY_FOR_OFFSET = [
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
] as const;

/** Byte-identical to the Phase 1E throwaway script this suite absorbed, so its results stay comparable. */
export const PREFERENCES_SNAPSHOT: PreferencesTalkSnapshot = {
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  dislikes: ["cilantro"],
  householdSize: 2,
  maxCookTimeWeeknight: 45,
  maxCookTimeWeekend: 90,
  cuisinePreferences: ["Thai"],
  memories: [
    { ref: 1, content: "Eases off heavy cream sauces." },
    { ref: 2, content: "Does Taco Tuesday most weeks." },
  ],
};

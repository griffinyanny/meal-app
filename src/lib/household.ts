// Household composition — the shape, its validation, and the two derivations
// every consumer needs. Lives in lib/ (pure, no drizzle) because three very
// different callers share it: the onboarding interview UI + the You tab
// (client), the tRPC preference writes (server), and the chef prompt builder
// (server). Importing the drizzle schema into a client component would pull the
// ORM into the browser bundle, so the schema file imports THIS instead.
//
// Shape decision (Phase 1E, S36): the locked onboarding design captures three
// band COUNTS — adults / children 2-12 / babies under 2 — not per-member ages.
// Per-member ages and per-person preference profiles are V1.5 (Family Member
// Profiles) and extend this object with an optional `members` array, additively.
import { z } from "zod";

// The one age signal we capture, and only when babies > 0. A baby's feeding
// stage changes both the meal guidance and the serving count in a way the
// "under 2" band can't express (Griffin, S36): under 6 months is milk-only and
// invisible to meal planning, 6-12 months eats adapted bits of the family
// dinner, 12-24 months eats the meal itself at a smaller portion.
export const BABY_STAGES = ["under_6m", "6_to_12m", "12_to_24m"] as const;
export const babyStageSchema = z.enum(BABY_STAGES);
export type BabyStage = (typeof BABY_STAGES)[number];

export const householdCompositionSchema = z
  .object({
    adults: z.number().int().min(1).max(20), // >= 1: the cook is an adult
    children: z.number().int().min(0).max(20), // ages 2-12
    babies: z.number().int().min(0).max(20), // under 2 — first foods
    // Only meaningful when babies > 0. With more than one baby it describes the
    // youngest — a deliberate R1 simplification (per-member ages are V1.5).
    babyStage: babyStageSchema.nullish(),
  })
  // Keeps the derived householdSize inside the [1,20] domain that
  // updatePreferences already validates.
  .refine((c) => c.adults + c.children + c.babies <= 20, {
    message: "Household size must be 20 or fewer",
  });

export type HouseholdComposition = z.infer<typeof householdCompositionSchema>;

export const DEFAULT_HOUSEHOLD_COMPOSITION: HouseholdComposition = {
  adults: 2,
  children: 0,
  babies: 0,
  babyStage: null,
};

// The single derivation of householdSize — the servings number every existing
// consumer already reads (plan generation's defaultServings, recipe scaling).
// Kids 2-12 eat a real portion and always count. Babies count ONLY at 12-24
// months, when they're eating the family meal rather than purees; counting a
// 6-month-old would over-scale every recipe (Griffin, S36). Clamped to >= 1 so
// servings math can never see a zero.
export function deriveHouseholdSize(c: HouseholdComposition): number {
  const eatingBabies = c.babyStage === "12_to_24m" ? c.babies : 0;
  return Math.max(1, Math.min(20, c.adults + c.children + eatingBabies));
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Human-readable roster ("2 adults, 1 child, and 1 baby"), used by the chef
// prompt and the interview's reflect screen so both describe the household the
// same way. Returns null for an adults-only household — "Default servings: N"
// already says everything there is to say, and a redundant sentence in the
// prompt is noise.
export function describeHousehold(c: HouseholdComposition): string | null {
  if (c.children === 0 && c.babies === 0) return null;

  const parts = [plural(c.adults, "adult", "adults")];
  if (c.children > 0) parts.push(plural(c.children, "child", "children"));
  if (c.babies > 0) parts.push(plural(c.babies, "baby", "babies"));

  const roster =
    parts.length === 2
      ? `${parts[0]} and ${parts[1]}`
      : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

  return roster;
}

// The cooking guidance a composition implies, as chef-voiced sentences. This is
// what makes the composition worth storing: ages drive prep, texture, and food
// safety. R1 plans ONE meal per slot and tells the chef how to adapt a portion
// of it — separate kid meals would need multiple recipes per slot (V1.5).
export function householdCookingNotes(c: HouseholdComposition): string[] {
  const notes: string[] = [];

  if (c.children > 0) {
    notes.push(
      "Keep at least part of each dinner kid-friendly: mild by default, with heat and bold seasoning served on the side rather than cooked in."
    );
  }

  if (c.babies > 0) {
    switch (c.babyStage) {
      case "under_6m":
        // Milk-only: no meal impact at all. Say so explicitly so the model
        // doesn't invent baby food that isn't needed yet.
        notes.push(
          "The baby is under 6 months and not on solids yet, so plan the adult meals normally."
        );
        break;
      case "12_to_24m":
        notes.push(
          "The youngest is 12 to 24 months and eats the family meal at a smaller portion: keep their share soft, low-salt, and cut small, and avoid whole nuts, whole grapes, popcorn, and hard raw chunks."
        );
        break;
      // 6-12 months, and the fallback when the stage wasn't captured — the
      // safest assumption for an unspecified "baby under 2" is early solids.
      case "6_to_12m":
      default:
        notes.push(
          "The youngest is starting solids, so note a simple first-foods portion from the same dish where one works: soft textures, no added salt, no honey, and no whole nuts, whole grapes, popcorn, or hard raw chunks."
        );
        break;
    }
  }

  return notes;
}

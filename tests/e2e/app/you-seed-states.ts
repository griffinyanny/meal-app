// Pure builders for the You-tab E2E seed states. No DB access — they return the
// exact user_preferences row + ai_memories rows a spec needs. Memories are listed
// in DISPLAY order (newest first); seedYouState stamps descending createdAt so the
// ledger's "newest first" ordering (and the collapse-to-3) is deterministic.

export type YouState =
  | "YOU_RETURNING" // a populated audit surface: hard constraints + a 5-item ledger
  | "YOU_NEW"; // no prefs row, no memory → "We've just met" + "Still learning"

import type { HouseholdComposition } from "@/lib/household";

export interface SeedPreferences {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  householdSize: number;
  // BUG-010/011/012 · seeded together, always. The pair is a derivation, and a
  // seed carrying a size with no composition is a state the app can no longer
  // produce for a user who answered the interview.
  householdComposition: HouseholdComposition;
  maxCookTimeWeeknight: number;
  maxCookTimeWeekend: number;
  cuisinePreferences: string[];
}

export interface SeedMemory {
  content: string;
  category: "preference" | "brand" | "feedback" | "behavior" | "restriction";
  sourceType: "explicit" | "implicit" | "onboarding";
}

export interface SeedYouSpec {
  preferences: SeedPreferences | null;
  memories: SeedMemory[];
}

export function buildYouSpec(state: YouState): SeedYouSpec {
  switch (state) {
    case "YOU_RETURNING":
      return {
        preferences: {
          dietaryFramework: "pescatarian",
          // "shellfish (allergy)" carries the allergy weighting marker; "no pork"
          // is a plain avoid → the safety card renders one with an "allergy"
          // sub-label and one without.
          restrictions: ["shellfish (allergy)", "no pork"],
          dislikes: ["cilantro", "blue cheese"],
          // 2 adults + 1 child = 3 servings. Deliberately a MIXED household:
          // this is the exact shape BUG-012 printed as "3 adults" on the one
          // surface whose job is letting you check the chef isn't wrong.
          householdSize: 3,
          householdComposition: {
            adults: 2,
            children: 1,
            babies: 0,
            babyStage: null,
          },
          maxCookTimeWeeknight: 45,
          maxCookTimeWeekend: 90,
          cuisinePreferences: ["Mediterranean", "Thai", "Mexican"],
        },
        // 5 memories spanning all three provenance labels; two implicit ("I
        // noticed") drive feature #6's dismiss path.
        memories: [
          {
            content: "Cooking for 2 adults; keep weeknights under 45 minutes.",
            category: "preference",
            sourceType: "onboarding",
          },
          {
            content: "Switched to pescatarian in July.",
            category: "preference",
            sourceType: "explicit",
          },
          {
            content: "Eases off heavy cream sauces.",
            category: "preference",
            sourceType: "implicit",
          },
          {
            content: "Does Taco Tuesday most weeks.",
            category: "behavior",
            sourceType: "implicit",
          },
          {
            content: "Prefers Rao's for jarred tomato sauce.",
            category: "brand",
            sourceType: "explicit",
          },
        ],
      };
    case "YOU_NEW":
      return { preferences: null, memories: [] };
  }
}

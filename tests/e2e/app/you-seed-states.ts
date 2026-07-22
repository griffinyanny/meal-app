// Pure builders for the You-tab E2E seed states. No DB access — they return the
// exact user_preferences row + ai_memories rows a spec needs. Memories are listed
// in DISPLAY order (newest first); seedYouState stamps descending createdAt so the
// ledger's "newest first" ordering (and the collapse-to-3) is deterministic.

export type YouState =
  | "YOU_RETURNING" // a populated audit surface: hard constraints + a 5-item ledger
  | "YOU_NEW"; // no prefs row, no memory → "We've just met" + "Still learning"

export interface SeedPreferences {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  householdSize: number;
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
          householdSize: 2,
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

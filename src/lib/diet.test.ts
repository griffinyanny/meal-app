import { describe, it, expect } from "vitest";
import {
  DIETARY_FRAMEWORKS,
  asDietaryFramework,
  isDietaryFramework,
} from "./diet";
import { dietaryFrameworkSchema } from "@/server/db/schema/memory";
import { DIET_OPTIONS } from "@/components/onboarding/onboarding-flow";
import { describeCaught } from "./onboarding/caught";
import { seedChips } from "./onboarding/synthesize";

// BUG-044. The domain was defined in five places that happened to agree; this is
// the layer that fails when they stop agreeing.
//
// Two of the five are now enforced by the TYPE — `Record<DietaryFramework, string>`
// makes a missing label a compile error in both `DIET_LABEL` maps. The chips are
// not: `(QuestionOption & { value: DietaryFramework })[]` says every entry is a
// real framework, and says nothing about whether they are all there. So a ninth
// framework would typecheck with no chip to select it, which is the drift this
// bug is about, one screen further on.

describe("the dietary-framework domain", () => {
  it("should have exactly one definition the persist schema is built from", () => {
    expect(dietaryFrameworkSchema.options).toEqual([...DIETARY_FRAMEWORKS]);
  });

  it("should offer a chip for every framework, and no duplicates", () => {
    const offered = DIET_OPTIONS.map((o) => o.value);
    // Sorted rather than order-matched: the chip ORDER is the design's and is
    // deliberately not the canonical list's. Coverage is the assertion; sequence
    // is a taste call the screen owns.
    expect([...offered].sort()).toEqual([...DIETARY_FRAMEWORKS].sort());
    expect(new Set(offered).size).toBe(offered.length);
  });

  it("should give every chip a label", () => {
    expect(DIET_OPTIONS.every((o) => o.label.trim().length > 0)).toBe(true);
  });
});

describe("narrowing at a trust boundary", () => {
  it("should accept every real framework", () => {
    for (const f of DIETARY_FRAMEWORKS) {
      expect(isDietaryFramework(f)).toBe(true);
      expect(asDietaryFramework(f)).toBe(f);
    }
  });

  it("should reject anything else, including near-misses and non-strings", () => {
    for (const v of ["", "Vegan", "vegan ", "carnivore", null, undefined, 7, {}]) {
      expect(isDietaryFramework(v)).toBe(false);
      expect(asDietaryFramework(v)).toBeNull();
    }
  });
});

// ⚠️ The sites BUG-013's fix did not reach. It removed `DIET_LABEL[x] ?? x` from
// `synthesizeHeadlineMemory` and left the identical expression at three siblings
// — one of which (`describeCaught`) runs SERVER-SIDE, reached from the user-talk
// router. Neither is exploitable today, because every upstream path validates
// against the same list before it gets here. That is precisely why they survived
// being looked at once: the defect is invisible unless you ask what ELSE wears
// the pattern you just fixed.
//
// Both assertions below fail against the pre-fix code, which echoed the raw
// value straight into user-visible text.
describe("an unrecognised framework is dropped, never echoed", () => {
  const snapshot = {
    dietaryFramework: "omnivore",
    restrictions: [],
    dislikes: [],
    cuisinePreferences: [],
    householdSize: 2,
    maxCookTimeWeeknight: 30,
    maxCookTimeWeekend: 60,
  };

  it("describeCaught should not surface a framework it has no label for", () => {
    const labels = describeCaught(
      snapshot,
      { dietaryFramework: "carnivore-<script>" },
      []
    );
    expect(labels.join(" ")).not.toContain("carnivore");
    expect(labels).toEqual([]);
  });

  it("seedChips should not surface a framework it has no label for", () => {
    const chips = seedChips({ dietaryFramework: "carnivore-<script>" });
    // ⚠️ LOWERCASED on both sides, and that is not fussiness. `seedChips` runs
    // its output through `capitalize()`, so a case-sensitive marker never
    // matches a string that HAS in fact been echoed — this assertion passed
    // against the pre-fix code until it was lowercased. Fourth instance of
    // "the apparatus has to be able to fail" (S51's proteins branch, verbatim).
    expect(chips.join(" ").toLowerCase()).not.toContain("carnivore");
  });

  it("should still surface the ones it does know", () => {
    expect(describeCaught(snapshot, { dietaryFramework: "vegan" }, [])).toEqual([
      "Vegan",
    ]);
    expect(seedChips({ dietaryFramework: "vegan" })).toContain("Vegan");
  });
});

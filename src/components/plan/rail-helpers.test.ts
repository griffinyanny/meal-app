import { describe, it, expect } from "vitest";
import { addDaysISO, type DisplayMeal } from "./plan-helpers";
import {
  carriesRationale,
  formatDuration,
  groupIntoDays,
  isAbsentDay,
  isProvisional,
  isTimeShapedTag,
  markersOf,
  mealTypeRank,
  metaLine,
  unplannedSpan,
  writtenCount,
} from "./rail-helpers";

function meal(overrides: Partial<DisplayMeal> = {}): DisplayMeal {
  return {
    id: "slot-1",
    date: "2026-07-26",
    dayName: "SUNDAY",
    relative: null,
    timeframe: "upcoming",
    slotType: "recipe",
    mealType: "dinner",
    title: "Miso-Glazed Salmon",
    description: null,
    rationale: null,
    ingredientPreview: [],
    tags: [],
    estTimeMinutes: null,
    servings: null,
    chips: [],
    feedback: null,
    recipeId: null,
    recipeStatus: "none",
    ...overrides,
  };
}

describe("metaLine — the BUG-008 contract", () => {
  it("should print one cook time and one serving count", () => {
    expect(metaLine(meal({ estTimeMinutes: 25, servings: 3 }))).toBe(
      "25 min · serves 3"
    );
  });

  it("should NOT print a second cook time when a time-shaped tag disagrees", () => {
    // The exact ADVERSARIAL-state defect: estTimeMinutes 95 alongside a "90 min"
    // tag rendered "95 min · … · 90 min" — one card stating two cook times.
    const m = meal({ estTimeMinutes: 95, servings: 2, tags: ["90 min"] });
    expect(metaLine(m)).toBe("1 hr 35 min · serves 2");
    expect(metaLine(m)).not.toContain("90 min");
  });

  it("should NOT print a duplicate cook time when a tag agrees", () => {
    // The everyday case, present on every seeded card: "30 min … 30 min".
    const m = meal({ estTimeMinutes: 30, servings: 2, tags: ["30 min"] });
    expect(metaLine(m)).toBe("30 min · serves 2");
    expect(m.tags).toHaveLength(1); // the tag survives, it just never reaches meta
  });

  it("should never let a non-time tag into the meta row either", () => {
    expect(metaLine(meal({ estTimeMinutes: 20, tags: ["seeded", "cooks ahead"] }))).toBe(
      "20 min"
    );
  });

  it("should render nothing when there is nothing to say", () => {
    expect(metaLine(meal())).toBe("");
  });
});

describe("isTimeShapedTag", () => {
  it.each([
    "30 min",
    "30min",
    "45 mins",
    "1 hr",
    "2 hours",
    "about 20 minutes",
    "~15 min",
  ])("should catch %s", (tag) => {
    expect(isTimeShapedTag(tag)).toBe(true);
  });

  it.each(["seeded", "cooks ahead", "one pan", "kid-friendly", "5 ingredients"])(
    "should leave %s alone",
    (tag) => {
      expect(isTimeShapedTag(tag)).toBe(false);
    }
  );
});

describe("formatDuration", () => {
  it("should read short cooks in minutes", () => {
    expect(formatDuration(20)).toBe("20 min");
  });

  it("should read a whole-hour cook in hours, not minutes", () => {
    // "240 min" makes the reader do arithmetic to learn it is a Sunday roast.
    expect(formatDuration(240)).toBe("4 hr");
  });

  it("should carry the remainder on an uneven long cook", () => {
    expect(formatDuration(95)).toBe("1 hr 35 min");
  });
});

describe("markersOf", () => {
  it("should promote a non-time tag above the title", () => {
    expect(markersOf(meal({ tags: ["cooks ahead"] }))).toEqual(["cooks ahead"]);
  });

  it("should drop time-shaped tags so they can never read as a duration", () => {
    expect(markersOf(meal({ tags: ["30 min", "cooks ahead"] }))).toEqual([
      "cooks ahead",
    ]);
  });

  it("should cap at one — the eyebrow is a label, not a tag cloud", () => {
    expect(markersOf(meal({ tags: ["one pan", "cooks ahead", "kid-friendly"] }))).toHaveLength(1);
  });
});

describe("carriesRationale — the gold budget mechanism", () => {
  it("should let dinner argue for its placement", () => {
    expect(carriesRationale("dinner")).toBe(true);
  });

  it.each(["lunch", "breakfast", "snack"] as const)(
    "should keep %s silent, so fifteen meals still make five gold marks",
    (type) => {
      expect(carriesRationale(type)).toBe(false);
    }
  );
});

describe("mealTypeRank — reading order, not storage order", () => {
  it("should lead the day with dinner, then lunch, then breakfast", () => {
    const order = (["breakfast", "dinner", "lunch"] as const)
      .slice()
      .sort((a, b) => mealTypeRank(a) - mealTypeRank(b));
    expect(order).toEqual(["dinner", "lunch", "breakfast"]);
  });
});

describe("groupIntoDays", () => {
  it("should put each day's meals in reading order inside one container", () => {
    const days = groupIntoDays([
      meal({ id: "b", mealType: "breakfast", title: "Oats" }),
      meal({ id: "d", mealType: "dinner", title: "Salmon" }),
      meal({ id: "l", mealType: "lunch", title: "Salad" }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0]!.meals.map((m) => m.mealType)).toEqual([
      "dinner",
      "lunch",
      "breakfast",
    ]);
  });

  it("should order days by date", () => {
    const days = groupIntoDays([
      meal({ id: "2", date: "2026-07-28" }),
      meal({ id: "1", date: "2026-07-26" }),
    ]);
    expect(days.map((d) => d.date)).toEqual(["2026-07-26", "2026-07-28"]);
  });

  it("should not invent rows for days with no meals", () => {
    // A WEEK IS THE DAYS YOU CHOSE, NEVER A CALENDAR WITH HOLES.
    const days = groupIntoDays([
      meal({ id: "1", date: "2026-07-30" }),
      meal({ id: "2", date: "2026-08-01" }),
    ]);
    expect(days).toHaveLength(2);
  });
});

describe("isAbsentDay", () => {
  it("should treat a night out as a rail line, not a container", () => {
    const days = groupIntoDays([meal({ slotType: "eating_out", title: null })]);
    expect(isAbsentDay(days[0]!)).toBe(true);
  });

  it("should keep a day with anything cookable in it as a container", () => {
    const days = groupIntoDays([
      meal({ id: "a", slotType: "eating_out", mealType: "lunch", title: null }),
      meal({ id: "b", slotType: "recipe", mealType: "dinner" }),
    ]);
    expect(isAbsentDay(days[0]!)).toBe(false);
  });
});

describe("isProvisional — the BUG-009 contract", () => {
  it("should call a titleless cookable slot provisional, never loading", () => {
    expect(isProvisional(meal({ title: null }))).toBe(true);
  });

  it("should not call a night out provisional — it has an answer", () => {
    expect(isProvisional(meal({ slotType: "eating_out", title: null }))).toBe(false);
  });

  it("should not call a written slot provisional", () => {
    expect(isProvisional(meal())).toBe(false);
  });
});

describe("writtenCount — a count, never a bar", () => {
  it("should count written meals against cookable slots", () => {
    const { written, total } = writtenCount([
      meal({ id: "1" }),
      meal({ id: "2", title: null }),
      meal({ id: "3" }),
    ]);
    expect({ written, total }).toEqual({ written: 2, total: 3 });
  });

  it("should not count a night out as something to write", () => {
    const { total } = writtenCount([
      meal({ id: "1" }),
      meal({ id: "2", slotType: "eating_out", title: null }),
    ]);
    expect(total).toBe(1);
  });
});

describe("unplannedSpan", () => {
  const weekStart = "2026-07-26"; // a Sunday

  it("should say nothing when every day is planned", () => {
    const days = groupIntoDays(
      Array.from({ length: 7 }, (_, i) =>
        meal({ id: `d${i}`, date: addDaysISO(weekStart, i) })
      )
    );
    expect(unplannedSpan(days, weekStart)).toBeNull();
  });

  it("should collapse a contiguous absence into one range", () => {
    // Thu–Sat planned; Sun–Wed is the absence (frames 3o/3p).
    const days = groupIntoDays([
      meal({ id: "1", date: "2026-07-30" }),
      meal({ id: "2", date: "2026-07-31" }),
      meal({ id: "3", date: "2026-08-01" }),
    ]);
    expect(unplannedSpan(days, weekStart)).toBe("Sun–Wed");
  });

  it("should name a single missing day without a range dash", () => {
    // Every day but Friday (offset 5).
    const days = groupIntoDays(
      [0, 1, 2, 3, 4, 6].map((i) =>
        meal({ id: `d${i}`, date: addDaysISO(weekStart, i) })
      )
    );
    expect(unplannedSpan(days, weekStart)).toBe("Fri");
  });

  it("should list separate runs rather than merging across a planned day", () => {
    // Tue and Fri planned — the gaps either side must not read as one span.
    const days = groupIntoDays([
      meal({ id: "1", date: "2026-07-28" }),
      meal({ id: "2", date: "2026-07-31" }),
    ]);
    expect(unplannedSpan(days, weekStart)).toBe("Sun–Mon, Wed–Thu, Sat");
  });
});

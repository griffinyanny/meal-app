// W1's second title rule, enforced in code rather than in the prompt.
//
// The ledger: "when one method covers four or more meals the week absorbs it
// once and the cards drop it." It was specified as a generation rule, and two
// Layer-B rounds proved a prompt cannot hold it. Round 2 asked for "I want to
// grill" WITH the rule in the system prompt and got back seven of seven:
//
//   Grilled Lemon-Herb Chicken Thighs · Grilled Citrus Salmon · Grilled
//   Portobello Burgers · Grilled Pork Tenderloin · Grilled Shrimp Skewers ·
//   Grilled Vegetable Platter · Grilled Steak Salad
//
// That is S40's original "seven Grilled X" finding, reproduced verbatim. The
// model is not disobeying — the person explicitly asked to grill, and a style
// clause cannot outrank the request it is competing with. Which is the tell
// that this was never a generation problem: "does one word open four or more
// titles" is a string test, and string tests belong in code.
//
// ABSORPTION IS A PRECONDITION FOR DROPPING. The method is only stripped from
// the cards when the week's summary already says it, so the information always
// survives exactly once instead of being silently deleted.

// Leading past-participle methods. Only ones that actually appear at the FRONT
// of a title are listed — "with Roasted Carrots" is mid-title and never matched.
const METHODS = [
  "Air-Fried",
  "Baked",
  "Braised",
  "Broiled",
  "Charred",
  "Fried",
  "Grilled",
  "Pan-Fried",
  "Pan-Seared",
  "Poached",
  "Roast",
  "Roasted",
  "Sauteed",
  "Sautéed",
  "Seared",
  "Slow-Cooked",
  "Smoked",
  "Steamed",
  "Stir-Fried",
] as const;

// Dishes whose NAME contains the method — stripping these renames the food.
// The four-title threshold makes collisions unlikely on its own (nobody plans
// four Grilled Cheese nights), so this is the belt to that braces.
const NAMED_DISHES = [
  "grilled cheese",
  "fried rice",
  "fried chicken",
  "roast beef",
  "baked ziti",
  "baked beans",
  "smoked salmon",
];

const MIN_MEALS_TO_ABSORB = 4;

function leadingMethod(title: string): string | null {
  for (const method of METHODS) {
    if (!title.toLowerCase().startsWith(`${method.toLowerCase()} `)) continue;
    const rest = title.slice(method.length + 1);
    const twoWords = `${method} ${rest.split(/\s+/)[0] ?? ""}`.toLowerCase();
    if (NAMED_DISHES.includes(twoWords)) return null;
    return method;
  }
  return null;
}

// "Pan-Seared" → "sear", "Grilled" → "grill", "Roast" → "roast".
function methodStem(method: string): string {
  const last = method.split("-").pop() ?? method;
  return last.toLowerCase().replace(/ed$/, "");
}

function strip(title: string, method: string): string {
  const rest = title.slice(method.length + 1).trimStart();
  if (!rest) return title;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/**
 * Drop a method that opens four or more of the week's titles, provided the
 * summary already carries it. Returns titles unchanged in every other case.
 *
 * Pure and week-scoped: a modify diff cannot see the whole week, so this runs
 * on generation only.
 */
export function absorbRepeatedMethod<T extends { title: string | null }>(
  meals: T[],
  chefSummary: string
): T[] {
  const counts = new Map<string, number>();
  for (const meal of meals) {
    // A null title is an eating-out night or a provisional slot (W5). It has no
    // method to absorb and must survive this pass untouched.
    if (!meal.title) continue;
    const method = leadingMethod(meal.title);
    if (method) counts.set(method, (counts.get(method) ?? 0) + 1);
  }

  const summary = chefSummary.toLowerCase();
  // The week has to have said it already. "Grilled" in the titles and nothing
  // in the summary means dropping it deletes the only place it was stated.
  //
  // Matched on the STEM, because a summary inflects where a title does not:
  // titles say "Grilled", summaries say "around the grill" or "grilling all
  // week". Stemming "grilled" → "grill" catches all three. Where the stem is a
  // poor handle (stir-fried → "fri") the match simply fails and nothing is
  // stripped — the safe direction, since not stripping only costs repetition
  // while a false strip would delete information.
  const absorbed = [...counts.entries()].find(
    ([method, count]) =>
      count >= MIN_MEALS_TO_ABSORB && summary.includes(methodStem(method))
  );
  if (!absorbed) return meals;

  const [method] = absorbed;
  return meals.map((meal) =>
    meal.title && leadingMethod(meal.title) === method
      ? { ...meal, title: strip(meal.title, method) }
      : meal
  );
}

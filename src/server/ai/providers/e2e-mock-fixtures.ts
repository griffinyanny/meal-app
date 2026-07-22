// Deterministic fixtures + request routing for the E2E AI mock. Pure functions,
// no side effects, importable by both the mock model and (indirectly, via
// exported constants) the Playwright specs so the expected strings live in ONE
// place and can never drift from what the mock returns.
//
// This file is only ever reached when E2E_AI_MOCK is on (see e2e-mock.ts). It
// carries no secrets and never runs in production.
import type { AIPlan, AIMeal, AIPlanModification } from "@/lib/plan-schema";
import type { AIRecipe } from "../tasks/types";

// Title prefix used by every generated meal. Specs assert on this to prove a
// freshly generated plan fully replaced a seeded one (whose titles start
// "Seeded"). Keep the two prefixes disjoint.
export const FRESH_TITLE_PREFIX = "Fresh";
export const REWORKED_TITLE_PREFIX = "Reworked";

const FRESH_DISHES = [
  "Sheet-Pan Salmon",
  "Chicken Stir-Fry",
  "Veggie Tacos",
  "Beef Chili",
  "Shrimp Pasta",
  "Margherita Pizza",
  "Lentil Curry",
];

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function freshMeal(dayOffset: number): AIMeal {
  const dish = FRESH_DISHES[dayOffset] ?? "Dinner";
  return {
    dayOffset,
    slotType: "recipe",
    title: `${FRESH_TITLE_PREFIX} ${dish}`,
    description: `A fresh take on ${dish.toLowerCase()} from your test chef.`,
    rationale: "Balanced and quick for a weeknight.",
    ingredientPreview: ["olive oil", "garlic", "seasonal veg"],
    tags: ["30 min"],
    estTimeMinutes: 30,
    servings: 2,
    chips: ["Make it vegetarian", "Swap the protein"],
  };
}

// The canned plan every generation returns. 7 dinners, offsets 0-6, all titled
// "Fresh …". The chef summary is a stable anchor for the review hero.
export const GENERATION_CHEF_SUMMARY =
  "A fresh, balanced week from your test chef.";

export function buildGenerationFixture(): AIPlan {
  return {
    chefSummary: GENERATION_CHEF_SUMMARY,
    meals: Array.from({ length: 7 }, (_, i) => freshMeal(i)),
  };
}

// Chef sentence for a whole-week ("lighter") modify — drives the M4 ack pill.
export const WHOLE_WEEK_CHEF_RESPONSE = "I lightened up two dinners this week.";
export const SCOPED_CHEF_RESPONSE = "Swapped in something new for that day.";
export const EATING_OUT_CHEF_RESPONSE = "Got it — I'll mark that night as eating out.";

function reworkedMeal(dayOffset: number, originalTitle: string | null): AIMeal {
  const base = (originalTitle ?? "dinner").replace(/^Seeded /, "");
  return {
    dayOffset,
    slotType: "recipe",
    title: `${REWORKED_TITLE_PREFIX} ${base}`,
    description: "A reworked dinner from your test chef.",
    rationale: "Adjusted to match your request.",
    ingredientPreview: ["fresh herbs", "lemon", "greens"],
    tags: ["light", "25 min"],
    estTimeMinutes: 25,
    servings: 2,
    chips: ["Make it heartier", "Swap the protein"],
  };
}

// ── Recipe hydration (Phase 1D) ───────────────────────────────────────────
// The doGenerate fixture for the `recipe-generate` task, reused by plan.hydrateSlot
// to turn a slot concept into a full recipe. Echoes the requested dish title (so
// specs can prove hydration linked the right slot's recipe) and returns the full
// nullable shape aiRecipeSchema expects.
export const HYDRATED_RECIPE_STEP = "Preheat, combine, and cook until done.";

export function buildRecipeFixture(promptText: string): AIRecipe {
  const m = promptText.match(/planned dinner: "([^"]+)"/i);
  const title = (m ? m[1] : "Test Recipe").trim() || "Test Recipe";
  return {
    title,
    description: `A full test recipe for ${title.toLowerCase()}.`,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    ingredients: [
      { qty: "2", unit: "cups", item: "seasonal veg", notes: null, group: null },
      { qty: "1", unit: "tbsp", item: "olive oil", notes: null, group: null },
      { qty: "2", unit: "cloves", item: "garlic", notes: "minced", group: null },
    ],
    steps: [
      { number: 1, text: HYDRATED_RECIPE_STEP, durationMinutes: 5, timers: null },
      { number: 2, text: "Plate and serve.", durationMinutes: null, timers: null },
    ],
    tags: ["test", "weeknight"],
  };
}

// ── Ingredient normalization (Phase 1D) ───────────────────────────────────
// The doGenerate fixture for the `ingredient-normalize` task. Parses the
// <ingredients> block the prompt builder emits and returns one deterministic
// normalization per line, so the whole generate pipeline (normalize → aggregate
// → write) runs under the mock. canonicalName strips prep notes; the unit map
// normalizes plurals so same-item lines across the week's recipes merge cleanly.
const NORMALIZE_CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(veg|garlic|onion|tomato|lettuce|greens|pepper|carrot|herb|lemon|lime)\b/, "produce"],
  [/\b(oil|flour|sugar|rice|pasta|bean|lentil|broth|stock|sauce|spice|salt)\b/, "pantry"],
  [/\b(milk|cheese|butter|cream|yogurt|egg)\b/, "dairy"],
  [/\b(chicken|beef|pork|steak|turkey)\b/, "meat"],
  [/\b(salmon|shrimp|fish|tuna|cod)\b/, "seafood"],
];

const NORMALIZE_UNIT_MAP: Record<string, string> = {
  cups: "cup",
  cup: "cup",
  cloves: "clove",
  clove: "clove",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  oz: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  cans: "can",
  can: "can",
};

interface NormalizeInputLine {
  index: number;
  unit: string;
  item: string;
}

function extractNormalizeLines(promptText: string): NormalizeInputLine[] {
  const lines: NormalizeInputLine[] = [];
  const re = /\[(\d+)\] qty: "([^"]*)" · unit: "([^"]*)" · item: "([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(promptText)) !== null) {
    lines.push({ index: Number(m[1]), unit: m[3], item: m[4] });
  }
  return lines;
}

function normalizeCanonicalName(item: string): string {
  // Drop prep notes / parentheticals: "garlic, minced" → "garlic".
  return item.split(/[,(]/)[0].trim().toLowerCase() || "item";
}

function normalizeCategory(name: string): string {
  for (const [re, cat] of NORMALIZE_CATEGORY_KEYWORDS) {
    if (re.test(name)) return cat;
  }
  return "other";
}

export function buildNormalizeFixture(promptText: string): {
  items: Array<{
    index: number;
    canonicalName: string;
    category: string;
    canonicalUnit: string;
    numericQty: number | null;
    confidence: number;
  }>;
} {
  const lines = extractNormalizeLines(promptText);
  return {
    items: lines.map((l) => {
      const canonicalName = normalizeCanonicalName(l.item);
      const unit = l.unit.trim().toLowerCase();
      return {
        index: l.index,
        canonicalName,
        category: normalizeCategory(canonicalName),
        canonicalUnit: NORMALIZE_UNIT_MAP[unit] ?? unit,
        numericQty: null, // the aggregator parses the qty string itself
        confidence: 1,
      };
    }),
  };
}

// ── Grocery "talk to the chef" (Phase 1D, Slice D) ────────────────────────
// The doGenerate fixture for the `grocery-talk` task. Parses <current_list>
// (numbered "[N] name (category)" lines) and <request>, and returns deterministic
// ops + reply so a spec can drive add / query / remove without the network. The
// remove path echoes a real [N] from the list, exercising the router's ref→id
// resolution (the ID-safety path).
export const GROCERY_TALK_TACO_ADDS = ["tortillas", "salsa", "cotija cheese"];
export const GROCERY_TALK_QUERY_REPLY =
  "You're low on eggs and milk — everything else looks stocked.";

interface TalkRefLine {
  ref: number;
  name: string;
}

function extractTalkList(promptText: string): TalkRefLine[] {
  const block = extractBlock(promptText, "current_list");
  if (!block) return [];
  const lines: TalkRefLine[] = [];
  const re = /\[(\d+)\]\s*([^(\n]+?)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    lines.push({ ref: Number(m[1]), name: m[2].trim() });
  }
  return lines;
}

function talkOp(
  kind: "add" | "remove",
  name = "",
  category = "other",
  qty = "",
  ref = 0
) {
  return { kind, name, category, qty, ref };
}

export function buildGroceryTalkFixture(promptText: string): {
  reply: string;
  ops: Array<{ kind: string; name: string; category: string; qty: string; ref: number }>;
} {
  const request = extractBlock(promptText, "request") ?? promptText;
  const list = extractTalkList(promptText);
  const lower = request.toLowerCase();

  // Remove: reference a listed item by its real [N] number.
  if (/\b(remove|delete|take off|drop)\b/.test(lower)) {
    const target = list.find((l) => lower.includes(l.name.toLowerCase()));
    return target
      ? { reply: `Removed ${target.name} from your list.`, ops: [talkOp("remove", "", "other", "", target.ref)] }
      : { reply: "I couldn't find that on your list.", ops: [] };
  }

  // Taco run: a fixed set of adds.
  if (/taco/.test(lower)) {
    return {
      reply: "Added tortillas, salsa, and cotija for taco night.",
      ops: GROCERY_TALK_TACO_ADDS.map((n) => talkOp("add", n)),
    };
  }

  // Query: no ops, just an answer.
  if (/\?|\bout of\b|what|on my list|do i have/.test(lower)) {
    return { reply: GROCERY_TALK_QUERY_REPLY, ops: [] };
  }

  // Generic add: "add <thing>" → add that thing.
  const addMatch = request.match(/add\s+(.+)/i);
  const thing = addMatch ? addMatch[1].trim().replace(/[.!]+$/, "") : "an item";
  return { reply: `Added ${thing}.`, ops: [talkOp("add", thing)] };
}

// ── Preferences "talk to the chef" (Phase 1E) ─────────────────────────────
// doGenerate fixture for the `preferences-talk` task. Parses <message> and the
// numbered <what_i_remember> block and returns deterministic ops + reply so a
// spec can drive an allergy capture (add_avoid flag=true), a diet change, a
// cuisine add, a free-form memory write, and a forget (exercising the router's
// ref→id resolution) without the network. Every op carries all six keys.
const PREF_CUISINES = [
  "japanese", "korean", "italian", "indian", "french",
  "greek", "spanish", "vietnamese", "chinese", "mexican", "thai",
];

interface RememberRefLine {
  ref: number;
  content: string;
}

function extractRememberList(promptText: string): RememberRefLine[] {
  const block = extractBlock(promptText, "what_i_remember");
  if (!block) return [];
  const lines: RememberRefLine[] = [];
  const re = /\[(\d+)\]\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    lines.push({ ref: Number(m[1]), content: m[2].trim() });
  }
  return lines;
}

function prefOp(
  kind: string,
  extras: {
    value?: string;
    flag?: boolean;
    amount?: number;
    ref?: number;
    category?: string;
  } = {}
) {
  return {
    kind,
    value: extras.value ?? "",
    flag: extras.flag ?? false,
    amount: extras.amount ?? 0,
    ref: extras.ref ?? 0,
    category: extras.category ?? "preference",
  };
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

export function buildPreferencesTalkFixture(promptText: string): {
  reply: string;
  ops: Array<{
    kind: string;
    value: string;
    flag: boolean;
    amount: number;
    ref: number;
    category: string;
  }>;
} {
  const message = extractBlock(promptText, "message") ?? promptText;
  const lower = message.toLowerCase();
  const memories = extractRememberList(promptText);

  // Allergy — highest priority, ALWAYS a flagged avoid (never a dislike).
  const allergyMatch = lower.match(/allerg(?:ic to|y to|ic|y|ies)?\s+([a-z ]+)/);
  if (/\ballerg/.test(lower)) {
    const food = (allergyMatch?.[1] ?? "").split(/[.,]/)[0].trim() || "it";
    return {
      reply: `Noted the ${food} allergy — I'll never cook with it.`,
      ops: [prefOp("add_avoid", { value: food, flag: true })],
    };
  }

  // Dropping a dietary framework with no replacement named → omnivore.
  if (/not (a )?(pescatarian|vegetarian|vegan|keto|paleo)/.test(lower)) {
    return {
      reply: "Updated your diet to omnivore.",
      ops: [prefOp("set_diet", { value: "omnivore" })],
    };
  }
  if (/go(ing)? vegan|vegan now/.test(lower)) {
    return { reply: "Switched you to vegan.", ops: [prefOp("set_diet", { value: "vegan" })] };
  }

  // Add any cuisine named in the message.
  const named = PREF_CUISINES.filter((c) => lower.includes(c));
  if (named.length > 0 && /add|love|like|lean|into/.test(lower)) {
    return {
      reply: `Added ${named.map(capitalize).join(" and ")} to your cuisines.`,
      ops: named.map((c) => prefOp("add_cuisine", { value: capitalize(c) })),
    };
  }

  // "Actually I do like X" → forget the memory that mentions X.
  const likeMatch = lower.match(/do like (\w+)|actually.*\blike (\w+)/);
  if (likeMatch) {
    const term = (likeMatch[1] ?? likeMatch[2] ?? "").trim();
    const target = memories.find((m) => m.content.toLowerCase().includes(term));
    if (target) {
      return {
        reply: `Good to know — I'll cook with ${term} again.`,
        ops: [prefOp("forget", { ref: target.ref })],
      };
    }
  }

  // Default: file it as a free-form memory.
  return {
    reply: "Got it — I'll remember that.",
    ops: [prefOp("remember", { value: message.trim(), category: "preference" })],
  };
}

// ── Prompt parsing ────────────────────────────────────────────────────────
// The mock receives the fully-rendered prompt (system + user messages). The
// modify task embeds <current_plan> (lines "Day N: Title") and <user_request>.

export interface MockDirectives {
  fail: boolean;
  slowMs: number | null;
}

// Test-only control tokens a spec can plant in a request string to force the
// error path or inject latency. Parsed from anywhere in the prompt text.
export function parseMockDirectives(promptText: string): MockDirectives {
  const fail = /\[E2E:FAIL\]/i.test(promptText);
  const slowMatch = promptText.match(/\[E2E:SLOW=(\d+)\]/i);
  return { fail, slowMs: slowMatch ? Number(slowMatch[1]) : null };
}

function extractBlock(promptText: string, tag: string): string | null {
  const m = promptText.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

interface PlanLine {
  dayOffset: number;
  title: string;
}

function extractPlanLines(promptText: string): PlanLine[] {
  const block = extractBlock(promptText, "current_plan");
  if (!block) return [];
  const lines: PlanLine[] = [];
  for (const raw of block.split("\n")) {
    const m = raw.match(/^Day (\d+):\s*(.+)$/);
    if (m) lines.push({ dayOffset: Number(m[1]), title: m[2].trim() });
  }
  return lines;
}

// (targetWeekday - todayWeekday) mod 7 — the offset of the next occurrence of a
// named weekday within a plan whose weekStart is today (UTC). Only used for the
// "eating out {day}" path, which has no title to anchor on. Documented coupling:
// assumes weekStart === today, which holds for the DRAFT seed state.
function offsetOfDayName(dayName: string): number | null {
  const idx = WEEKDAYS.indexOf(dayName.toUpperCase());
  if (idx < 0) return null;
  const todayIdx = new Date().getUTCDay();
  return (idx - todayIdx + 7) % 7;
}

function findDayNameInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const day of WEEKDAYS) {
    if (lower.includes(day.toLowerCase())) return day;
  }
  return null;
}

// Routes a modify request to a deterministic modification fixture. Order:
//  1. "eating out" → remove the named day (or first upcoming if unnamed)
//  2. a plan title appears in the request (scoped chip / meal chat) → rework it
//  3. otherwise (whole-week request) → rework two mid-week days
export function buildModificationFixture(promptText: string): AIPlanModification {
  const request = extractBlock(promptText, "user_request") ?? promptText;
  const planLines = extractPlanLines(promptText);

  if (/eating out/i.test(request)) {
    const dayName = findDayNameInText(request);
    const offset = dayName ? offsetOfDayName(dayName) : null;
    const removed = offset != null ? offset : 2;
    return {
      chefResponse: EATING_OUT_CHEF_RESPONSE,
      changedMeals: [],
      removedDayOffsets: [removed],
    };
  }

  const matched = planLines.find(
    (l) => l.title.length > 0 && request.includes(l.title)
  );
  if (matched) {
    return {
      chefResponse: SCOPED_CHEF_RESPONSE,
      changedMeals: [reworkedMeal(matched.dayOffset, matched.title)],
      removedDayOffsets: [],
    };
  }

  // Whole-week: rework offsets 1 and 3 (both exist in every seeded week).
  const line1 = planLines.find((l) => l.dayOffset === 1);
  const line3 = planLines.find((l) => l.dayOffset === 3);
  return {
    chefResponse: WHOLE_WEEK_CHEF_RESPONSE,
    changedMeals: [
      reworkedMeal(1, line1?.title ?? null),
      reworkedMeal(3, line3?.title ?? null),
    ],
    removedDayOffsets: [],
  };
}

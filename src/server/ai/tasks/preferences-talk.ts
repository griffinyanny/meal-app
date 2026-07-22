// The `preferences-talk` AI task (Phase 1E). A free-text You-tab message becomes a
// set of typed constraint/memory ops + a one-line reply. The single retry lives in
// generateStructured; a hard failure propagates so the sheet can surface an error
// (it keeps the text so nothing is lost). The router applies the coerced ops.
import { generateStructured } from "@/server/ai";
import {
  aiPreferencesTalkSchema,
  buildPreferencesTalkSystemPrompt,
  buildPreferencesTalkUserPrompt,
  DIETARY_FRAMEWORKS,
  MEMORY_CATEGORIES,
  type AIPreferencesTalkResponse,
  type PreferencesTalkSnapshot,
} from "@/server/ai/prompts/preferences-talk";

export type { PreferencesTalkSnapshot };

type DietaryFramework = (typeof DIETARY_FRAMEWORKS)[number];
type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

// The cleaned, typed ops the router applies. A discriminated union so the fields
// of one kind can't be confused for another's. A `forget` carries only a `ref` (a
// position in the memory list WE numbered) — resolved to a real id by the router.
export type PreferencesTalkOp =
  | { kind: "set_diet"; value: DietaryFramework }
  | { kind: "add_avoid"; value: string; isAllergy: boolean }
  | { kind: "remove_avoid"; value: string }
  | { kind: "add_dislike"; value: string }
  | { kind: "remove_dislike"; value: string }
  | { kind: "set_household"; amount: number }
  | { kind: "set_weeknight"; amount: number }
  | { kind: "set_weekend"; amount: number }
  | { kind: "add_cuisine"; value: string }
  | { kind: "remove_cuisine"; value: string }
  | { kind: "remember"; value: string; category: MemoryCategory }
  | { kind: "forget"; ref: number };

export interface PreferencesTalkResult {
  reply: string;
  ops: PreferencesTalkOp[];
}

const dietaryFrameworkSet = new Set<string>(DIETARY_FRAMEWORKS);
const memoryCategorySet = new Set<string>(MEMORY_CATEGORIES);

function clampInt(raw: number, min: number, max: number): number | null {
  const n = Math.trunc(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

// Coerce the model output into clean typed ops. Drops anything nonsensical
// (unknown kind, empty value, out-of-range amount, non-positive forget ref)
// rather than guessing — a dropped op is safe; a wrong one is not. The forget
// ref is deliberately left unresolved: the router bounds-checks it against the
// household's real memory list.
export function coercePreferencesTalk(
  response: AIPreferencesTalkResponse
): PreferencesTalkResult {
  const ops: PreferencesTalkOp[] = [];

  for (const raw of response.ops) {
    const kind = raw.kind.trim().toLowerCase();
    const value = raw.value.trim();

    switch (kind) {
      case "set_diet": {
        const diet = value.toLowerCase();
        if (dietaryFrameworkSet.has(diet)) {
          ops.push({ kind: "set_diet", value: diet as DietaryFramework });
        }
        break;
      }
      case "add_avoid":
        if (value) ops.push({ kind: "add_avoid", value, isAllergy: raw.flag === true });
        break;
      case "remove_avoid":
        if (value) ops.push({ kind: "remove_avoid", value });
        break;
      case "add_dislike":
        if (value) ops.push({ kind: "add_dislike", value });
        break;
      case "remove_dislike":
        if (value) ops.push({ kind: "remove_dislike", value });
        break;
      case "add_cuisine":
        if (value) ops.push({ kind: "add_cuisine", value });
        break;
      case "remove_cuisine":
        if (value) ops.push({ kind: "remove_cuisine", value });
        break;
      case "set_household": {
        const amount = clampInt(raw.amount, 1, 20);
        if (amount !== null) ops.push({ kind: "set_household", amount });
        break;
      }
      case "set_weeknight": {
        const amount = clampInt(raw.amount, 5, 300);
        if (amount !== null) ops.push({ kind: "set_weeknight", amount });
        break;
      }
      case "set_weekend": {
        const amount = clampInt(raw.amount, 5, 600);
        if (amount !== null) ops.push({ kind: "set_weekend", amount });
        break;
      }
      case "remember": {
        if (!value) break;
        const cat = raw.category.trim().toLowerCase();
        // Memories captured via talk are never restrictions (those go to
        // add_avoid); default a bad/blank category to a plain preference.
        const category: MemoryCategory =
          memoryCategorySet.has(cat) && cat !== "restriction"
            ? (cat as MemoryCategory)
            : "preference";
        ops.push({ kind: "remember", value, category });
        break;
      }
      case "forget": {
        const ref = Math.trunc(raw.ref);
        if (ref >= 1) ops.push({ kind: "forget", ref });
        break;
      }
      // Unknown kind: drop it.
    }
  }

  return { reply: response.reply.trim(), ops };
}

// The typed preference fields the ops can change (a subset of user_preferences).
export interface PreferencesState {
  dietaryFramework: string;
  restrictions: string[];
  dislikes: string[];
  householdSize: number;
  maxCookTimeWeeknight: number;
  maxCookTimeWeekend: number;
  cuisinePreferences: string[];
}

export interface AppliedPreferencesTalk {
  // Only the fields that actually changed, both keyed identically — nextPatch is
  // what to persist, undoPatch is the before-values to reverse it.
  nextPatch: Partial<PreferencesState>;
  undoPatch: Partial<PreferencesState>;
  remember: Array<{ content: string; category: MemoryCategory }>;
  // Still the model's [N] refs — the router resolves them to real ids.
  forgetRefs: number[];
}

// Strip a trailing "(allergy)" marker so an avoid can be matched/deduped by its
// underlying food regardless of how it's flagged. The marker is how allergy
// weighting is stored in the plain string[] (no schema change) and is what the
// You-tab safety card reads to render the "allergy" sub-label.
function avoidBase(s: string): string {
  return s.replace(/\s*\(allergy\)\s*$/i, "").trim().toLowerCase();
}

function ciEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Pure application of coerced ops to a preferences snapshot. Deterministic, no I/O
// — the router wraps it with the DB read/write and the memory ref→id resolution.
// Capped at maxOps as a blast-radius backstop independent of the prompt.
export function applyPreferencesTalkOps(
  orig: PreferencesState,
  ops: PreferencesTalkOp[],
  maxOps = 12
): AppliedPreferencesTalk {
  let dietaryFramework = orig.dietaryFramework;
  let restrictions = [...orig.restrictions];
  let dislikes = [...orig.dislikes];
  let householdSize = orig.householdSize;
  let maxCookTimeWeeknight = orig.maxCookTimeWeeknight;
  let maxCookTimeWeekend = orig.maxCookTimeWeekend;
  let cuisinePreferences = [...orig.cuisinePreferences];
  const remember: Array<{ content: string; category: MemoryCategory }> = [];
  const forgetRefs: number[] = [];

  for (const op of ops.slice(0, maxOps)) {
    switch (op.kind) {
      case "set_diet":
        dietaryFramework = op.value;
        break;
      case "add_avoid": {
        const base = avoidBase(op.value);
        const idx = restrictions.findIndex((r) => avoidBase(r) === base);
        if (idx === -1) {
          if (restrictions.length < 50) {
            restrictions.push(op.isAllergy ? `${op.value} (allergy)` : op.value);
          }
        } else if (op.isAllergy && !/\(allergy\)\s*$/i.test(restrictions[idx])) {
          // The user just disclosed an allergy for a food already on the plain
          // avoid list — upgrade it in place so it gets the allergy weighting,
          // rather than silently treating it as a no-change duplicate.
          restrictions[idx] = `${op.value} (allergy)`;
        }
        break;
      }
      case "remove_avoid": {
        const base = avoidBase(op.value);
        restrictions = restrictions.filter((r) => avoidBase(r) !== base);
        break;
      }
      case "add_dislike":
        if (dislikes.length < 50 && !dislikes.some((d) => ciEqual(d, op.value)))
          dislikes.push(op.value);
        break;
      case "remove_dislike":
        dislikes = dislikes.filter((d) => !ciEqual(d, op.value));
        break;
      case "add_cuisine":
        if (cuisinePreferences.length < 20 && !cuisinePreferences.some((c) => ciEqual(c, op.value)))
          cuisinePreferences.push(op.value);
        break;
      case "remove_cuisine":
        cuisinePreferences = cuisinePreferences.filter((c) => !ciEqual(c, op.value));
        break;
      case "set_household":
        householdSize = op.amount;
        break;
      case "set_weeknight":
        maxCookTimeWeeknight = op.amount;
        break;
      case "set_weekend":
        maxCookTimeWeekend = op.amount;
        break;
      case "remember":
        remember.push({ content: op.value, category: op.category });
        break;
      case "forget":
        forgetRefs.push(op.ref);
        break;
    }
  }

  const nextPatch: Partial<PreferencesState> = {};
  const undoPatch: Partial<PreferencesState> = {};
  const markScalar = <K extends keyof PreferencesState>(
    key: K,
    next: PreferencesState[K],
    prev: PreferencesState[K]
  ) => {
    if (next !== prev) {
      nextPatch[key] = next;
      undoPatch[key] = prev;
    }
  };
  const markArray = (
    key: "restrictions" | "dislikes" | "cuisinePreferences",
    next: string[],
    prev: string[]
  ) => {
    if (!arraysEqual(next, prev)) {
      nextPatch[key] = next;
      undoPatch[key] = prev;
    }
  };

  markScalar("dietaryFramework", dietaryFramework, orig.dietaryFramework);
  markArray("restrictions", restrictions, orig.restrictions);
  markArray("dislikes", dislikes, orig.dislikes);
  markScalar("householdSize", householdSize, orig.householdSize);
  markScalar("maxCookTimeWeeknight", maxCookTimeWeeknight, orig.maxCookTimeWeeknight);
  markScalar("maxCookTimeWeekend", maxCookTimeWeekend, orig.maxCookTimeWeekend);
  markArray("cuisinePreferences", cuisinePreferences, orig.cuisinePreferences);

  return { nextPatch, undoPatch, remember, forgetRefs };
}

export async function talkToPreferencesChef(
  snapshot: PreferencesTalkSnapshot,
  message: string
): Promise<PreferencesTalkResult> {
  const response = await generateStructured({
    task: "preferences-talk",
    system: buildPreferencesTalkSystemPrompt(),
    prompt: buildPreferencesTalkUserPrompt(snapshot, message),
    schema: aiPreferencesTalkSchema,
  });
  return coercePreferencesTalk(response);
}

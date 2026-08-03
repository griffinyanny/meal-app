// The dietary-framework domain, in ONE place (BUG-044, 1F/D security review).
//
// ⚠️ It was defined in FIVE places, and they all happened to agree — which is
// the only reason nothing had broken:
//
//   1. `dietaryFrameworkSchema` (db/schema/memory.ts) — the persist gate
//   2. `DIETARY_FRAMEWORKS` (ai/prompts/preferences-talk.ts) — what the model is told
//   3. `DIET_LABEL` (lib/onboarding/synthesize.ts) — chef-voice sentence fragments
//   4. `DIET_LABEL` (lib/onboarding/caught.ts) — UI labels
//   5. `DIET_OPTIONS` (components/onboarding/onboarding-flow.tsx) — the chips
//
// BUG-013 fixed the consequence of that spread (`DIET_LABEL[x] ?? x` echoing a
// caller-supplied string into persisted memory text) at one call site. The
// CAUSE was that no single thing said what a dietary framework is, so the next
// framework added to the chips would have shipped without a label, without a
// prompt entry, or without a schema value — and each of those fails silently in
// a different way. Adding a ninth value is now a type error everywhere it is
// missing.
//
// Pure and dependency-free on purpose: the db schema, the AI prompts, two lib
// modules and a client component all read it, so it can import from none of them.

export const DIETARY_FRAMEWORKS = [
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "mediterranean",
  "other",
] as const;

export type DietaryFramework = (typeof DIETARY_FRAMEWORKS)[number];

const FRAMEWORK_SET = new Set<string>(DIETARY_FRAMEWORKS);

/** Narrowing guard for anything crossing a trust boundary as a plain string. */
export function isDietaryFramework(value: unknown): value is DietaryFramework {
  return typeof value === "string" && FRAMEWORK_SET.has(value);
}

/**
 * A value we recognise, or null.
 *
 * ⚠️ Coerce rather than reject, deliberately, and this is a DEVIATION from the
 * fix `bug-tracker.md` recommends for BUG-044 ("narrow `interviewStateSchema`
 * to the enum"). Applied literally that turns an unrecognised framework into a
 * 400 on `finishOnboarding` — i.e. the LAST step of the interview fails, and
 * the interview fires exactly once per account. The field is display-only on
 * that path: nothing persists it, and `synthesizeHeadlineMemory` already drops
 * a framework it has no label for.
 *
 * So the security property worth having is "the server never treats an
 * unvalidated string as a framework", and coercion delivers exactly that while
 * failing safe. The parsed value is typed `DietaryFramework | null`, so no
 * downstream caller can be handed a raw string either way — which was the real
 * complaint.
 */
export function asDietaryFramework(value: unknown): DietaryFramework | null {
  return isDietaryFramework(value) ? value : null;
}

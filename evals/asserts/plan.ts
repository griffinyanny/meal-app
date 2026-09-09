// Assertions shared by the two plan doors, generation and modification.
//
// They live together because the doors keep turning out to have the same holes.
// The internal day-numbering leak was found and fixed on the generation path,
// and reappeared months later in modify because nothing had asked whether the
// second door had it too. Anything true of "the chef writing about a week"
// belongs here, applied to both.
import { WEEKDAY_FOR_OFFSET, type Persona } from "../fixtures/personas";

/** Text the person actually reads, from either door's output shape. */
export interface ChefProse {
  lines: string[];
  /** Per-meal text keyed by the day it sits on, for direction-aware checks. */
  perDay: { dayOffset: number; text: string }[];
  /** Everything, including ingredient hints and tags, for restriction checks. */
  all: string;
}

/** Internal vocabulary (`Day 0`, `day 3`) leaking into copy a person reads. */
export function dayVocabHits(prose: ChefProse): string[] {
  return prose.lines.filter((line) => /\bday\s*\d/i.test(line));
}

/**
 * A reuse claim pointing at a day that has not happened yet.
 *
 * The defect this exists for read "uses the leftover dill from Monday" on a
 * Thursday card, in a week where Monday was four days LATER and held different
 * food. Only backward-LOOKING phrasing counts: a plan that says "makes extra for
 * Friday" is correct, so matching every weekday mention would fail good output.
 */
export function backwardReferenceViolations(prose: ChefProse): string[] {
  const violations: string[] = [];
  for (const meal of prose.perDay) {
    for (const [offset, weekday] of WEEKDAY_FOR_OFFSET.entries()) {
      const claimsPast = new RegExp(`(from|left ?over from|reusing from)\\s+${weekday}`, "i");
      if (claimsPast.test(meal.text) && offset >= meal.dayOffset) {
        violations.push(
          `day ${meal.dayOffset} claims to reuse from ${weekday} (day ${offset})`
        );
      }
    }
  }
  return violations;
}

/** Restriction words that must never appear, with plant-based substitutes excluded. */
export function forbiddenHits(prose: ChefProse, persona: Persona): string[] {
  return persona.forbidden
    .map((pattern) => pattern.exec(prose.all)?.[0])
    .filter((hit): hit is string => Boolean(hit));
}

/**
 * A cooking method opening four or more titles is the WEEK's idea, not each
 * meal's — checked against the RAW model output, because the app's validator
 * strips exactly this and would make the check unfailable.
 */
export function methodRail(titles: string[]): string | null {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const first = title.trim().split(/\s+/)[0]?.toLowerCase();
    if (!first || !/^(grilled|roasted|baked|fried|braised|seared|stir)/.test(first)) continue;
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  for (const [word, count] of counts) {
    if (count >= 4) return `${word} opens ${count} titles`;
  }
  return null;
}

export const weekdayName = (offset: number): string =>
  WEEKDAY_FOR_OFFSET[offset] ?? `day ${offset}`;

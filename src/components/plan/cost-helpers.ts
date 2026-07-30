// Cost estimation display (Phase 1E.5 · W6).
//
// GRIFFIN'S CALL AT PHASE OPEN (S43). The recommendation was to drop the design's
// `~$87` / `$94 spent` numbers, because we have no cost model, an LLM estimate is
// ungrounded, and it is the one figure on the screen a user can audit against a
// real receipt. Griffin chose to build the estimate instead. These helpers exist
// to make the honest version of that choice:
//
//   1. ALWAYS TILDE-PREFIXED. The estimate never renders as a bare figure, so it
//      can never be read as a price we actually know.
//   2. NEVER CENTS. False precision is the failure mode that costs the most
//      trust: "$86.40" claims a resolution the model does not have, "~$86" does
//      not. We round rather than truncate — a low guess reads worse than a high
//      one at the till.
//   3. NULL-SAFE. An un-estimated week renders no row at all, never "$0". Zero
//      is a claim; absence is the truth.

/** Round to whole dollars. Cents never reach the screen (guardrail 2). */
export function formatEstimate(cents: number | null | undefined): string | null {
  if (cents == null || !Number.isFinite(cents) || cents <= 0) return null;
  return `~$${Math.round(cents / 100)}`;
}

/**
 * Sum the per-slot estimates for a draft week.
 *
 * Returns null when NOTHING carries an estimate — a week with no numbers shows
 * no number. A partially-estimated week returns the partial sum, because a
 * draft where two of five slots are still being written is honestly described
 * by "the three I've written come to about this".
 */
export function sumSlotEstimates(
  slots: ReadonlyArray<{ estCostCents?: number | null }>
): number | null {
  let total = 0;
  let seen = 0;
  for (const slot of slots) {
    if (slot.estCostCents != null && slot.estCostCents > 0) {
      total += slot.estCostCents;
      seen += 1;
    }
  }
  return seen === 0 ? null : total;
}

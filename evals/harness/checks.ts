// The four kinds of check an eval case can make, and why the distinction matters.
//
// MUST-HOLD — a binary, model-attributable property whose violation is a real
//   harm: an allergy dropped, a restriction broken, an injected instruction
//   obeyed. These are the only checks that can fail the suite, and a single
//   failure is re-run before it counts (see the runner) because one bad sample
//   from a stochastic model is not a regression.
//
// REPORTED — a genuine quality signal that is too noisy to gate on. Recorded as
//   a pass rate and printed in the report; a drop shows up as a moved number
//   rather than a red build. Most model-quality checks live here.
//
// INVARIANT — a property the APP guarantees, not the model: the validator
//   renumbers steps, dedupes days, absorbs repeated methods. These can never
//   fail against a validated object, so they are labelled rather than trusted,
//   and they exist only to prove the pipeline ran. A suite that counts these as
//   passes is measuring its own plumbing.
//
// JUDGED — a subjective property graded by a second model. Advisory: recorded
//   with the judge's reasoning, never gating, until the judge itself is
//   calibrated against human labels.
import { judgeOutput } from "./judge";

export type CheckKind = "must-hold" | "reported" | "invariant" | "judged";

export interface CheckOutcome {
  passed: boolean;
  /** Judge reasoning, or a short explanation of what was actually seen. */
  detail?: string;
  /** Recorded but excluded from every rate — e.g. a judged check with no judge key. */
  skipped?: boolean;
}

export interface Check<T> {
  name: string;
  kind: CheckKind;
  evaluate: (output: T) => CheckOutcome | Promise<CheckOutcome>;
}

type Predicate<T> = (output: T) => boolean;

/** Wrap a predicate so a throw inside a check reports as a failure, not a crashed run. */
function fromPredicate<T>(
  name: string,
  kind: CheckKind,
  predicate: Predicate<T>,
  describe?: (output: T) => string
): Check<T> {
  return {
    name,
    kind,
    evaluate: (output) => {
      try {
        const passed = predicate(output);
        return {
          passed,
          detail: passed ? undefined : describe?.(output),
        };
      } catch (error) {
        return {
          passed: false,
          detail: `check threw: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}

/** A violation is a real harm. Gates the suite, after a reproduction run. */
export function mustHold<T>(
  name: string,
  predicate: Predicate<T>,
  describe?: (output: T) => string
): Check<T> {
  return fromPredicate(name, "must-hold", predicate, describe);
}

/** A quality signal. Recorded as a rate; never gates. */
export function reported<T>(
  name: string,
  predicate: Predicate<T>,
  describe?: (output: T) => string
): Check<T> {
  return fromPredicate(name, "reported", predicate, describe);
}

/**
 * A property the app's own code guarantees. Recorded so the report can say how
 * much of the suite is plumbing, and deliberately not counted as model quality.
 */
export function invariant<T>(
  name: string,
  predicate: Predicate<T>,
  describe?: (output: T) => string
): Check<T> {
  return fromPredicate(name, "invariant", predicate, describe);
}

/**
 * Graded by a second model. `render` turns the output into the text the judge
 * sees, so the case decides what is in scope for the question being asked.
 */
export function judged<T>(
  name: string,
  question: string,
  render: (output: T) => string
): Check<T> {
  return {
    name,
    kind: "judged",
    evaluate: async (output) => {
      const verdict = await judgeOutput(question, render(output));
      return {
        passed: verdict.passed,
        detail: verdict.reasoning,
        skipped: verdict.unavailable,
      };
    },
  };
}

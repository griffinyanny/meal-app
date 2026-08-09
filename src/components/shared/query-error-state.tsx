"use client";

export interface QueryErrorStateProps {
  /** What failed to load, in the chef's voice: "your week", "your list". */
  subject: string;
  onRetry: () => void;
}

/**
 * ⚠️ A FAILED FETCH MUST NOT LOOK LIKE "YOU HAVE NO DATA YET" — BUG-065.
 *
 * The rule is `react-components.md`'s ("error states must have fallback UI with
 * a retry action, not blank screens") and it was already written out longhand
 * in `you-page-client.tsx`, which had the only correct implementation in the
 * app. Plan and Groceries never consulted their query's `isError` at all:
 *
 *   • Plan fell through to `NoPlanState` — so a failed `plan.current` told the
 *     user their confirmed week was GONE and offered to generate a new one,
 *     which overwrites. On the north-star flow's front door.
 *   • Groceries passed `isError={generateMutation.isError}` — the MUTATION's
 *     error — and rendered "no list yet" when the query itself failed.
 *
 * ⚠️ That is worse than the blank screen the scope was written against. **A
 * blank screen tells the truth.** This one stated something false about the
 * user's data and offered a destructive remedy, and the tell is that nothing
 * looks broken.
 *
 * Extracted at the third call site, which is the repo's stated threshold —
 * three hand-written copies of an error card drift, and the copy that drifts is
 * the one nobody looks at because it only renders when something else is
 * already wrong.
 */
export function QueryErrorState({ subject, onRetry }: QueryErrorStateProps) {
  return (
    <div className="px-[22px] pt-16 text-center">
      <p className="spec-body text-foreground">The chef couldn&apos;t load {subject}.</p>
      <p className="mt-1 spec-body text-muted-foreground">
        Check your connection and try again.
      </p>
      <button
        type="button"
        data-testid="query-error-retry"
        onClick={onRetry}
        className="mt-4 rounded-[14px] bg-primary px-5 py-2.5 text-[0.9rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

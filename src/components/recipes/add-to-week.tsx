"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { writePickHandoff } from "@/lib/plan/pick-handoff";

/**
 * `Add to this week` — the Recipes DETAIL screen's one floating object
 * (Phase 1E.5 · W10, frame `3l`).
 *
 * IT NEVER ASKS FOR A DAY. The chef answers with the night, and that answer is
 * the payoff: a verb that opened a day picker would make this a scheduler, which
 * is exactly what the ledger says a chosen recipe is not.
 *
 * Two outcomes, because there are two states of the world. With a week on the
 * table the chef places the recipe and says which night and why, right here. With
 * no week at all there is nothing to place it into — so the pick rides into the
 * intent screen instead of failing at a button that reads like it should work.
 */
export function AddToWeek({ recipeId, title }: { recipeId: string; title: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [answer, setAnswer] = useState<string | null>(null);

  const planQuery = trpc.plan.current.useQuery();
  const pickMutation = trpc.plan.pick.useMutation({
    onSuccess: (data) => {
      setAnswer(data.chefResponse);
      utils.plan.current.invalidate();
    },
  });

  const hasWeek = (planQuery.data?.slots.length ?? 0) > 0;
  // Until the plan query resolves, `hasWeek` is false because there is no data
  // — not because there is no week. Acting on that would send someone with a
  // live week to the intent screen for tapping quickly, which is both wrong and
  // the kind of wrong that only shows up on a slow connection.
  const undecided = planQuery.isLoading;

  function handleClick() {
    if (!hasWeek) {
      writePickHandoff({ id: recipeId, title });
      router.push("/plan");
      return;
    }
    pickMutation.mutate({ recipeIds: [recipeId] });
  }

  return (
    <div
      className="fixed left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* THE CHEF'S ANSWER, WHERE THE ASK WAS. It replaces the button rather
          than sitting beside it — the same rule §C applies to Plan's action bar,
          for the same reason: one floating object, and after a pick the useful
          one is the answer, not a second chance to press. */}
      {answer ? (
        <div
          role="status"
          data-testid="add-to-week-answer"
          className="spec-glass rounded-2xl px-[14px] py-3 shadow-[0_18px_46px_-14px_rgba(0,0,0,0.75)]"
        >
          <p
            className="m-0 text-[13.5px] italic leading-[1.45] text-[var(--spec-gold-voice)]"
            style={{ textWrap: "pretty" }}
          >
            {answer}
          </p>
          <Link
            href="/plan"
            className="mt-1.5 inline-block text-[13px] font-semibold text-[var(--spec-action)]"
          >
            See the week →
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={pickMutation.isPending || undecided}
          data-testid="add-to-week"
          className="h-[52px] w-full rounded-2xl bg-[var(--spec-action)] text-[15.5px] font-[650] text-[var(--spec-action-on)] shadow-[0_10px_28px_-12px_rgba(244,235,220,0.3)] transition-opacity disabled:opacity-60"
        >
          {/* BUG-037. `undecided` is a real reason to refuse a tap, but with no
              label of its own it photographed as a dead grey primary rather than
              a loading one — the screen's ONE floating object, reading as
              broken. Naming the wait costs nothing and is true. */}
          {pickMutation.isPending
            ? "Working it in…"
            : undecided
              ? "Checking your week…"
              : "Add to this week"}
        </button>
      )}

      {pickMutation.error && !answer ? (
        <p
          role="alert"
          className="mt-2 text-center text-[12.5px] text-[var(--spec-destructive-text)]"
        >
          That didn&apos;t take — try again?
        </p>
      ) : null}
    </div>
  );
}

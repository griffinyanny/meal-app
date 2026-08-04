"use client";

import { useEffect, useRef } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { trackListReady } from "@/lib/analytics/funnel";
import { GroceryList } from "./grocery-list";
import { GroceryTitle } from "./grocery-title";

type GroceryListData = NonNullable<RouterOutputs["grocery"]["current"]>;

// generationStatus values that mean "still working" — the tab polls while in one
// of these and shows phase-named, chef-voice copy.
const GENERATING_PHASES = ["pending", "hydrating", "normalizing", "aggregating"] as const;
const TERMINAL = new Set(["ready", "error"]);

const PHASE_COPY: Record<string, string> = {
  pending: "Getting started…",
  hydrating: "Finishing your recipes…",
  normalizing: "Sorting your ingredients…",
  aggregating: "Merging your grocery list…",
};

export function GroceriesPageClient() {
  const utils = trpc.useUtils();

  const currentQuery = trpc.grocery.current.useQuery(undefined, {
    // Poll while the projection is building; stop once it's ready or errored.
    refetchInterval: (query) => {
      const status = query.state.data?.generationStatus;
      if (!status || TERMINAL.has(status)) return false;
      return 1500;
    },
  });

  const generateMutation = trpc.grocery.generate.useMutation({
    onSettled: () => utils.grocery.current.invalidate(),
  });

  const list = currentQuery.data;
  // Fire generation exactly once per pending list (guard against the effect
  // re-running on each poll). generate itself is idempotent server-side too.
  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!list) return;
    if (
      list.generationStatus === "pending" &&
      firedFor.current !== list.id &&
      !generateMutation.isPending
    ) {
      firedFor.current = list.id;
      generateMutation.mutate({ listId: list.id });
    }
  }, [list, generateMutation]);

  function retry() {
    if (!list) return;
    firedFor.current = list.id;
    generateMutation.mutate({ listId: list.id });
  }

  // ⚠️ THE NORTH-STAR CLOCK STOPS HERE (1F/D3). The DoD requires "time-to-list
  // measured < 10 minutes on a real week", and this is the moment the list
  // becomes shoppable — a different tab, a confirm and a background projection
  // away from where the clock started, which is why the ritual id lives in
  // localStorage rather than in React state.
  //
  // Guarded per list id: the tab polls, and `ready` is observed on every poll
  // after the first. `trackListReady` also clears the ritual, so a remount or
  // a second device cannot report the same one twice.
  const reportedReadyFor = useRef<string | null>(null);
  useEffect(() => {
    if (!list || list.generationStatus !== "ready") return;
    if (reportedReadyFor.current === list.id) return;
    reportedReadyFor.current = list.id;

    trackListReady({
      itemCount: list.items.length,
      sectionCount: new Set(list.items.map((i) => i.category)).size,
      generationMs: Math.max(0, Date.now() - new Date(list.createdAt).getTime()),
    });
  }, [list]);

  // Exactly the condition under which `Body` renders `GroceryList` — which is
  // the only branch that draws its own heading. Derived here rather than
  // approximated as `status === "ready"`, because `isError` can be true on a
  // ready list (a failed retry), and that combination would otherwise render
  // the error card under NO heading at all — the very bug being fixed,
  // surviving in the one state hardest to reach.
  const readyPath =
    !!list && list.generationStatus === "ready" && !generateMutation.isError;

  return (
    <div className="space-y-3.5 p-4">
      {/* BUG-054 · the heading renders on EVERY state. It used to live inside
          the ready-path header, so generating / error / no-list were an
          unlabelled document with no <h1> at all. The ready path draws its own
          (with the count + Copy cluster attached), so this renders only when
          that one will not — one heading on screen, never two. */}
      {!readyPath && <GroceryTitle />}
      <Body
        list={list}
        isLoading={currentQuery.isLoading}
        isError={generateMutation.isError}
        errorMessage={
          list?.generationError ?? generateMutation.error?.message ?? null
        }
        onRetry={retry}
      />
    </div>
  );
}

interface BodyProps {
  list: GroceryListData | null | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

function Body({ list, isLoading, isError, errorMessage, onRetry }: BodyProps) {
  if (isLoading && !list) {
    return <GeneratingState label="Loading…" />;
  }

  // No list yet — confirm a plan to create one.
  if (!list) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-muted-foreground spec-body">
          Your grocery list will appear here after you confirm a meal plan.
        </p>
      </div>
    );
  }

  if (list.generationStatus === "error" || isError) {
    return (
      <div className="glass-card flex flex-col items-center space-y-3 p-8 text-center">
        <p className="spec-body text-muted-foreground">
          The chef got stuck building your list.
        </p>
        {errorMessage ? (
          <p className="spec-meta text-destructive/80">{errorMessage}</p>
        ) : null}
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if ((GENERATING_PHASES as readonly string[]).includes(list.generationStatus)) {
    return <GeneratingState label={generatingLabel(list)} />;
  }

  // ready → the shoppable list
  return <GroceryList list={list} />;
}

// Phase copy, except the straggler path gets an honest hint that NAMES the
// remaining work ("Finishing 3 recipes…") instead of generic shimmer copy
// (BUG-004, Phase D). The poll refreshes pendingRecipeCount, so the number
// counts down live as each straggler recipe lands.
function generatingLabel(list: GroceryListData): string {
  if (list.generationStatus === "hydrating" && list.pendingRecipeCount > 0) {
    const n = list.pendingRecipeCount;
    return n === 1 ? "Finishing 1 recipe…" : `Finishing ${n} recipes…`;
  }
  return PHASE_COPY[list.generationStatus] ?? "Working…";
}

function GeneratingState({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <p className="spec-body text-muted-foreground" data-testid="grocery-generating">
        {label}
      </p>
      <div className="glass-card p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="shimmer-bar h-3 w-2/3 rounded-full" />
            <div className="shimmer-bar h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

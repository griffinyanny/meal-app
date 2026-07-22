"use client";

import { useEffect, useRef } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { GroceryList } from "./grocery-list";

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

  return (
    <div className="p-4">
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
        <p className="text-muted-foreground text-sm">
          Your grocery list will appear here after you confirm a meal plan.
        </p>
      </div>
    );
  }

  if (list.generationStatus === "error" || isError) {
    return (
      <div className="glass-card flex flex-col items-center space-y-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The chef got stuck building your list.
        </p>
        {errorMessage ? (
          <p className="text-xs text-destructive/80">{errorMessage}</p>
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
      <p className="text-sm text-muted-foreground" data-testid="grocery-generating">
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

"use client";

import { useEffect, useRef } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { GROCERY_CATEGORIES } from "@/lib/grocery-categories";

type GroceryList = NonNullable<RouterOutputs["grocery"]["current"]>;
type GroceryItem = GroceryList["items"][number];

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

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  GROCERY_CATEGORIES.map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)])
);

// Slice B renders an honest, plain grouped list; the imported design (amber
// dots, drag, one-zone check-off) lands in Slice C.
function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity == null) return "as needed";
  const n = Number.isInteger(quantity)
    ? String(quantity)
    : String(Math.round(quantity * 100) / 100);
  return unit ? `${n} ${unit}` : n;
}

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
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Groceries</h1>
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
  list: GroceryList | null | undefined;
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
    return <GeneratingState label={PHASE_COPY[list.generationStatus] ?? "Working…"} />;
  }

  // ready
  return <ReadyList items={list.items} />;
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

function ReadyList({ items }: { items: GroceryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[160px] text-center">
        <p className="text-muted-foreground text-sm">
          Your list is empty. Add items or confirm a plan to fill it.
        </p>
      </div>
    );
  }

  // Group by category in the schema's aisle order; items already arrive ordered
  // by (category, position) from grocery.current.
  const byCategory = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }
  const orderedCategories = GROCERY_CATEGORIES.filter((c) => byCategory.has(c));

  return (
    <div className="space-y-6" data-testid="grocery-list">
      {orderedCategories.map((category) => (
        <section key={category} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[category] ?? category}
          </p>
          <ul className="glass-card divide-y divide-border/40">
            {byCategory.get(category)!.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm text-foreground/90">{item.name}</span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatQty(item.quantity, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

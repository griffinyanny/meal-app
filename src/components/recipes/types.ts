import type { RouterOutputs } from "@/lib/trpc";

// The recipe row as returned by recipe.list / recipe.search, shared across the
// Recipes-tab tier components so the shape stays in sync with the router.
export type RecipeListItem = RouterOutputs["recipe"]["list"]["items"][number];

// A recipe is a plan DRAFT while it still hangs off a plan (sourcePlanId set) —
// that FK cascades it away when the plan is replaced. Favoriting or cooking it
// nulls sourcePlanId, graduating it into the deliberate library. See scope-1D #14.
export function isPlanDraft(r: RecipeListItem): boolean {
  return r.sourcePlanId != null;
}

// Format a lastCookedAt stamp for a card, e.g. "Jul 12". Stamped at noon-UTC of
// the cooked day (harvest-cooked.ts), so read it back in UTC to keep the day.
export function formatCookedDate(value: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// The card's meta line: "30 min · Serves 4 · Pasta".
export function recipeMeta(r: RecipeListItem): string {
  const parts: string[] = [];
  if (r.totalTimeMinutes) parts.push(`${r.totalTimeMinutes} min`);
  if (r.servings) parts.push(`Serves ${r.servings}`);
  const tag = r.tags?.[0];
  if (tag) parts.push(tag);
  return parts.join(" · ");
}

"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeCard } from "./recipe-card";
import type { RecipeListItem } from "./types";

export type PlanDraftsShelfProps = {
  drafts: RecipeListItem[];
  collapsed: boolean;
  onToggle: () => void;
  promotedId: string | null;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onOpen: (id: string) => void;
};

// "FROM YOUR PLANS" — plan-hydrated recipes, secondary and collapsed by default.
// Favoriting one promotes it into the library above (detaches it from its plan).
export function PlanDraftsShelf({
  drafts,
  collapsed,
  onToggle,
  promotedId,
  onFavorite,
  onOpen,
}: PlanDraftsShelfProps) {
  return (
    <section aria-label="From your plans" className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        data-testid="drafts-toggle"
        className="w-full flex items-center gap-2 cursor-pointer"
      >
        <span className="spec-eyebrow">
          From your plans
        </span>
        {drafts.length > 0 && (
          <span className="spec-label text-muted-foreground/60">
            {drafts.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 spec-meta text-muted-foreground">
          {collapsed ? "Show" : "Hide"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              collapsed && "-rotate-90"
            )}
          />
        </span>
      </button>

      {collapsed ? (
        drafts.length > 0 ? (
          <p className="spec-meta text-muted-foreground">
            {drafts.length} tucked away · favorite one to keep it in Your recipes
          </p>
        ) : (
          <p className="spec-meta text-muted-foreground">
            No plan drafts right now — they appear as your meal plan fills in.
          </p>
        )
      ) : drafts.length > 0 ? (
        <div className="space-y-3" data-testid="drafts-list">
          {drafts.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              badge="draft"
              promoted={promotedId === r.id}
              onFavorite={onFavorite}
              onClick={onOpen}
            />
          ))}
        </div>
      ) : (
        <p className="spec-meta text-muted-foreground">
          No plan drafts right now — they appear as your meal plan fills in.
        </p>
      )}
    </section>
  );
}

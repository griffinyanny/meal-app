"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCookedDate, recipeMeta, type RecipeListItem } from "./types";

export type RecipeCardProps = {
  recipe: RecipeListItem;
  // A draft badge marks a plan draft; a cooked badge shows "Cooked Jul 12".
  badge?: "draft" | "cooked" | null;
  // Just promoted out of the drafts shelf — draws the one-shot highlight ring.
  promoted?: boolean;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onClick: (id: string) => void;
};

export function RecipeCard({
  recipe,
  badge,
  promoted,
  onFavorite,
  onClick,
}: RecipeCardProps) {
  const { id, title, isFavorite } = recipe;
  const cooked = formatCookedDate(recipe.lastCookedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="recipe-card"
      data-recipe-id={id}
      className={cn(
        "glass-card flex items-center gap-3 p-4 text-left w-full transition-all",
        "active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        promoted && "animate-highlight-ring"
      )}
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(id);
        }
      }}
      aria-label={`View recipe: ${title}`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="spec-row-title line-clamp-2">
          {title}
        </h3>
        <p className="spec-meta text-muted-foreground mt-1">{recipeMeta(recipe)}</p>

        {(badge === "draft" || (badge === "cooked" && cooked)) && (
          <div className="mt-2">
            {badge === "draft" ? (
              // Neutral inset, not the cream action hue. "Plan draft" is a state
              // you read, and cream is what you press (§01) — painting a label
              // in it says "tap me" about a word that does nothing.
              <span className="inline-block spec-label px-2 py-0.5 rounded-md border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.07)] text-muted-foreground">
                Plan draft
              </span>
            ) : (
              <span className="inline-block spec-meta px-2 py-0.5 rounded-md spec-success-soft text-[var(--spec-success)]">
                Cooked {cooked}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        // 44px, the control the spec names by hand (§12 item 05). The glyph
        // stays 18px and the box paints nothing, so this is hit area only.
        className="shrink-0 grid place-items-center size-11 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          onFavorite(id, !isFavorite);
        }}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorite}
      >
        <Heart
          className={cn(
            "size-[18px] transition-colors",
            isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}

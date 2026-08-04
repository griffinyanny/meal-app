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
    // ⚠️ BUG-062 · A PLAIN CONTAINER, not `role="button"`.
    //
    // This was a `<div role="button" tabIndex={0}>` wrapping the favourite
    // heart, which is a real `<button>` — `nested-interactive`, and the first
    // gated finding of the 1F/D a11y sweep. Two concrete consequences, neither
    // visible in a screenshot: assistive tech treats a `button`'s subtree as
    // one control, so the heart was unreachable or announced as part of the
    // card; and the card's accessible name is computed from its whole subtree,
    // so every card announced its title AND "Add to favorites".
    //
    // The fix is the standard one for a card with a secondary action: the
    // TITLE is the control, and its `::after` is stretched over the card so the
    // whole surface stays tappable. One control named by the recipe, one named
    // by the verb, no nesting, and the card is still a single tap target.
    <div
      data-testid="recipe-card"
      data-recipe-id={id}
      className={cn(
        "glass-card relative flex items-center gap-3 p-4 text-left w-full transition-all",
        "active:scale-[0.99] cursor-pointer",
        promoted && "animate-highlight-ring"
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="spec-row-title line-clamp-2">
          {/* ⚠️ BUG-060 still holds: the accessible name is this button's own
              TEXT, never an interpolated `aria-label`. rrweb records attributes
              verbatim and replay masking reaches text nodes only, so a label
              here would put the whole recipe library into session replay in the
              clear while the visible titles were correctly masked. The static
              fallback is only for a recipe with no title at all. */}
          <button
            type="button"
            onClick={() => onClick(id)}
            aria-label={title ? undefined : "View recipe"}
            className={cn(
              "text-left after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
              "focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            )}
          >
            {title}
          </button>
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
        // `relative` lifts it above the title's stretched `::after` — without
        // it the overlay would sit on top and swallow every tap on the heart.
        className="relative shrink-0 grid place-items-center size-11 rounded-full"
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

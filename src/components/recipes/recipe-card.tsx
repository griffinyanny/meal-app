"use client";

import { Heart, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecipeCardProps = {
  id: string;
  title: string;
  description: string | null;
  totalTimeMinutes: number | null;
  servings: number | null;
  sourceType: string;
  isFavorite: boolean;
  tags: string[] | null;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onClick: (id: string) => void;
};

export function RecipeCard({
  id,
  title,
  description,
  totalTimeMinutes,
  servings,
  sourceType,
  isFavorite,
  tags,
  onFavorite,
  onClick,
}: RecipeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="glass-card p-4 text-left w-full transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(id);
        }
      }}
      aria-label={`View recipe: ${title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {title}
        </h3>
        <button
          type="button"
          className="shrink-0 p-1 -m-1 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(id, !isFavorite);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              isFavorite
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
          {description}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        {totalTimeMinutes && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {totalTimeMinutes}m
          </span>
        )}
        {servings && (
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {servings}
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">
          {sourceType === "ai_generated"
            ? "AI"
            : sourceType === "url_import"
              ? "Import"
              : sourceType === "modification"
                ? "Modified"
                : "Manual"}
        </span>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

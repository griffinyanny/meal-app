"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Heart,
  Clock,
  Users,
  Pencil,
  Trash2,
  GitBranch,
} from "lucide-react";

export type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const router = useRouter();
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modification, setModification] = useState("");

  const {
    data: recipe,
    isLoading,
    isError,
    refetch,
  } = trpc.recipe.get.useQuery({ id });
  const utils = trpc.useUtils();

  const favoriteMutation = trpc.recipe.favorite.useMutation({
    onSuccess: () => utils.recipe.get.invalidate({ id }),
  });

  const deleteMutation = trpc.recipe.delete.useMutation({
    onSuccess: () => {
      utils.recipe.list.invalidate();
      router.push("/recipes");
    },
  });

  const modifyMutation = trpc.recipe.modify.useMutation({
    onSuccess: (modified) => {
      setModifyOpen(false);
      setModification("");
      router.push(`/recipes/${modified.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 glass-card animate-pulse opacity-30" />
        <div className="h-48 glass-card animate-pulse opacity-30" />
        <div className="h-64 glass-card animate-pulse opacity-30" />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => router.push("/recipes")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
          aria-label="Back to recipes"
        >
          <ArrowLeft className="size-4" />
          Recipes
        </button>
        <div className="glass-card p-8 text-center space-y-3">
          <p className="text-muted-foreground">
            {isError ? "Couldn't load this recipe" : "Recipe not found"}
          </p>
          {isError && (
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/recipes")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
          aria-label="Back to recipes"
        >
          <ArrowLeft className="size-4" />
          Recipes
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              favoriteMutation.mutate({
                id: recipe.id,
                isFavorite: !recipe.isFavorite,
              })
            }
            aria-label={
              recipe.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={cn(
                "size-4",
                recipe.isFavorite
                  ? "fill-primary text-primary"
                  : "text-muted-foreground"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setModifyOpen(true)}
            aria-label="Modify recipe"
          >
            <Pencil className="size-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (confirm("Delete this recipe?")) {
                deleteMutation.mutate({ id: recipe.id });
              }
            }}
            aria-label="Delete recipe"
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Title + meta */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {recipe.totalTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {recipe.totalTimeMinutes} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {recipe.servings} servings
            </span>
          )}
          {recipe.parentRecipeId && (
            <span className="flex items-center gap-1 text-primary">
              <GitBranch className="size-3" />
              Modified
            </span>
          )}
        </div>
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary mt-1 inline-block hover:underline"
          >
            View original source
          </a>
        )}
      </div>

      {/* Ingredients */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ingredients
        </h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 size-1.5 rounded-full bg-primary mt-1.5" />
              <span>
                <span className="text-foreground">
                  {ing.qty} {ing.unit}
                </span>{" "}
                <span className="text-foreground font-medium">{ing.item}</span>
                {ing.notes && (
                  <span className="text-muted-foreground"> ({ing.notes})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Steps
        </h2>
        <ol className="space-y-4">
          {recipe.steps.map((step) => (
            <li key={step.number} className="flex gap-3 text-sm">
              <span className="shrink-0 size-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {step.number}
              </span>
              <div>
                <p className="text-foreground leading-relaxed">{step.text}</p>
                {step.durationMinutes && (
                  <span className="text-xs text-primary mt-1 inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {step.durationMinutes} min
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Modify dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="glass-sheet rounded-t-3xl sm:rounded-2xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Modify recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder='e.g. "Make it dairy-free" or "Double the servings" or "Add more spice"'
              value={modification}
              onChange={(e) => setModification(e.target.value)}
              className="min-h-[80px] bg-white/5 border-white/8 resize-none"
              disabled={modifyMutation.isPending}
            />
            {modifyMutation.error && (
              <p className="text-xs text-destructive">
                {modifyMutation.error.message}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!modification.trim() || modifyMutation.isPending}
              onClick={() =>
                modifyMutation.mutate({
                  recipeId: recipe.id,
                  modification: modification.trim(),
                })
              }
            >
              {modifyMutation.isPending
                ? "Your chef is modifying..."
                : "Modify recipe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

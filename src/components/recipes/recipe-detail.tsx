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
import { FreeformField } from "@/components/shared/freeform-field";
import { cn } from "@/lib/utils";
import { RecipeView } from "./recipe-view";
import { AddToWeek } from "./add-to-week";
import { ArrowLeft, Heart, Pencil, Trash2 } from "lucide-react";

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
    // pb-32 clears the floating primary — `3l` puts `Add to this week` at
    // bottom 96, and without the padding it covers the end of the steps.
    <div className="p-4 pb-32 space-y-4">
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

      {/* Title + meta + ingredients + steps + tags (shared presentational body) */}
      <RecipeView recipe={recipe} showHeader />

      {/* W10 · the detail screen's ONE floating object, and it is the verb. */}
      <AddToWeek recipeId={recipe.id} title={recipe.title} />

      {/* Modify dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="glass-sheet rounded-t-[22px] sm:rounded-[22px] max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Modify recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Spec §09's one control; its send is the commit, so the
                full-width `Modify recipe` button is gone rather than sitting
                beside a second filled cream button (§08 law 06). */}
            <FreeformField
              value={modification}
              onChange={setModification}
              onSubmit={() => {
                if (!modification.trim() || modifyMutation.isPending) return;
                modifyMutation.mutate({
                  recipeId: recipe.id,
                  modification: modification.trim(),
                });
              }}
              placeholder='e.g. "Make it dairy-free" or "Double the servings"'
              inputAriaLabel="Tell the chef how to modify this recipe"
              isSubmitting={modifyMutation.isPending}
              submittingLabel="MODIFYING…"
              inputTestId="modify-recipe-input"
              sendTestId="modify-recipe-send"
            />
            {modifyMutation.error && (
              <p className="text-xs text-destructive">
                {modifyMutation.error.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

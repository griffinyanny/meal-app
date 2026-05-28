"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { RecipeCard } from "./recipe-card";
import { GenerateRecipeDialog } from "./generate-recipe-dialog";
import { ImportRecipeDialog } from "./import-recipe-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Link2, Search } from "lucide-react";

export function RecipeLibrary() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Debounce the search input so we fire one query after typing settles,
  // not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const utils = trpc.useUtils();
  const recipesQuery = trpc.recipe.list.useQuery();
  const searchResults = trpc.recipe.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  );

  const favoriteMutation = trpc.recipe.favorite.useMutation({
    // Per-item optimistic update. We flip only the one recipe in both caches
    // (rather than snapshotting/restoring the whole list), so concurrent
    // toggles on different recipes can't clobber each other, and rollback
    // always targets the exact item that failed — independent of search state.
    onMutate: async ({ id, isFavorite }) => {
      const searchKey = debouncedQuery ? { query: debouncedQuery } : null;
      await utils.recipe.list.cancel();
      if (searchKey) await utils.recipe.search.cancel(searchKey);

      setItemFavorite(id, isFavorite, searchKey);
      return { id, isFavorite, searchKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) setItemFavorite(ctx.id, !ctx.isFavorite, ctx.searchKey);
    },
    onSettled: (_data, _err, _vars, ctx) => {
      utils.recipe.list.invalidate();
      if (ctx?.searchKey) utils.recipe.search.invalidate(ctx.searchKey);
    },
  });

  function setItemFavorite(
    id: string,
    isFavorite: boolean,
    searchKey: { query: string } | null
  ) {
    utils.recipe.list.setData(undefined, (old) =>
      old
        ? {
            ...old,
            items: old.items.map((r) =>
              r.id === id ? { ...r, isFavorite } : r
            ),
          }
        : old
    );
    if (searchKey) {
      utils.recipe.search.setData(searchKey, (old) =>
        old?.map((r) => (r.id === id ? { ...r, isFavorite } : r))
      );
    }
  }

  const isSearching = searchQuery.length > 0;
  const recipes = isSearching
    ? searchResults.data ?? []
    : recipesQuery.data?.items ?? [];
  const isLoading = isSearching
    ? searchResults.isLoading ||
      searchResults.isFetching ||
      debouncedQuery !== searchQuery
    : recipesQuery.isLoading;
  const isError = isSearching ? searchResults.isError : recipesQuery.isError;

  function handleRecipeClick(id: string) {
    router.push(`/recipes/${id}`);
  }

  function handleRecipeCreated(recipeId: string) {
    router.push(`/recipes/${recipeId}`);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search your recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/8"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 glass-card border-white/8"
          onClick={() => setGenerateOpen(true)}
        >
          <Sparkles className="size-3.5" />
          Generate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 glass-card border-white/8"
          onClick={() => setImportOpen(true)}
        >
          <Link2 className="size-3.5" />
          Import URL
        </Button>
      </div>

      {/* Recipe grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-4 h-28 animate-pulse opacity-30"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-8 flex flex-col items-center text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your recipes
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              isSearching ? searchResults.refetch() : recipesQuery.refetch()
            }
          >
            Try again
          </Button>
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          isSearching={isSearching}
          onGenerate={() => setGenerateOpen(true)}
          onImport={() => setImportOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              description={recipe.description}
              totalTimeMinutes={recipe.totalTimeMinutes}
              servings={recipe.servings}
              sourceType={recipe.sourceType}
              isFavorite={recipe.isFavorite}
              tags={recipe.tags}
              onFavorite={(id, isFavorite) =>
                favoriteMutation.mutate({ id, isFavorite })
              }
              onClick={handleRecipeClick}
            />
          ))}
        </div>
      )}

      <GenerateRecipeDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={handleRecipeCreated}
      />
      <ImportRecipeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleRecipeCreated}
      />
    </div>
  );
}

type EmptyStateProps = {
  isSearching: boolean;
  onGenerate: () => void;
  onImport: () => void;
};

function EmptyState({ isSearching, onGenerate, onImport }: EmptyStateProps) {
  if (isSearching) {
    return (
      <div className="glass-card p-8 flex flex-col items-center text-center">
        <p className="text-sm text-muted-foreground">No recipes found</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 flex flex-col items-center text-center space-y-4">
      <p className="text-sm text-muted-foreground">
        Your recipe library is empty
      </p>
      <p className="text-xs text-muted-foreground/60">
        Ask your chef to generate something, or import a recipe from the web.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onGenerate}>
          <Sparkles className="size-3.5" />
          Generate
        </Button>
        <Button size="sm" variant="outline" onClick={onImport}>
          <Link2 className="size-3.5" />
          Import
        </Button>
      </div>
    </div>
  );
}

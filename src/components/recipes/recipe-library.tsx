"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { RecipeCard } from "./recipe-card";
import { CookedStrip } from "./cooked-strip";
import { RecipeFilters, type RecipeFilter } from "./recipe-filters";
import { PlanDraftsShelf } from "./plan-drafts-shelf";
import { RecipeToolbar } from "./recipe-toolbar";
import { GenerateRecipeDialog } from "./generate-recipe-dialog";
import { ImportRecipeDialog } from "./import-recipe-dialog";
import { isPlanDraft, type RecipeListItem } from "./types";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 5;

export function RecipeLibrary() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<RecipeFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [foldPlans, setFoldPlans] = useState(true);
  const [promotedId, setPromotedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const promoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search so we fire one query after typing settles.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => () => {
    if (promoteTimer.current) clearTimeout(promoteTimer.current);
  }, []);

  const listQuery = trpc.recipe.list.useQuery();
  const searchResults = trpc.recipe.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  );

  const favoriteMutation = trpc.recipe.favorite.useMutation({
    // Per-item optimistic patch in both caches so concurrent toggles on
    // different recipes can't clobber each other. Favoriting a plan draft also
    // detaches it locally (sourcePlanId → null) so it jumps to the library at once.
    onMutate: async ({ id, isFavorite }) => {
      const searchKey = debouncedQuery ? { query: debouncedQuery } : null;
      await utils.recipe.list.cancel();
      if (searchKey) await utils.recipe.search.cancel(searchKey);
      patchItem(id, isFavorite, searchKey);
      return { id, isFavorite, searchKey };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) patchItem(ctx.id, !ctx.isFavorite, ctx.searchKey, true);
    },
    onSettled: (_d, _e, _v, ctx) => {
      utils.recipe.list.invalidate();
      if (ctx?.searchKey) utils.recipe.search.invalidate(ctx.searchKey);
    },
  });

  function patchItem(
    id: string,
    isFavorite: boolean,
    searchKey: { query: string } | null,
    rollback = false
  ) {
    // On a real favorite (not a rollback), promoting a draft detaches it.
    const apply = (r: RecipeListItem): RecipeListItem =>
      r.id !== id
        ? r
        : {
            ...r,
            isFavorite,
            sourcePlanId: !rollback && isFavorite ? null : r.sourcePlanId,
          };
    utils.recipe.list.setData(undefined, (old) =>
      old ? { ...old, items: old.items.map(apply) } : old
    );
    if (searchKey) {
      utils.recipe.search.setData(searchKey, (old) => old?.map(apply));
    }
  }

  function handleFavorite(id: string, isFavorite: boolean) {
    const target = listQuery.data?.items.find((r) => r.id === id);
    const wasDraft = target ? isPlanDraft(target) : false;
    favoriteMutation.mutate({ id, isFavorite });
    if (isFavorite && wasDraft) {
      setPromotedId(id);
      setToast("Moved to Your recipes");
      if (promoteTimer.current) clearTimeout(promoteTimer.current);
      promoteTimer.current = setTimeout(() => {
        setPromotedId(null);
        setToast(null);
      }, 1800);
    }
  }

  const openRecipe = (id: string) => router.push(`/recipes/${id}`);
  const onCreated = (id: string) => router.push(`/recipes/${id}`);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      {isSearching ? (
        <SearchResults
          results={searchResults.data ?? []}
          isLoading={
            searchResults.isLoading ||
            searchResults.isFetching ||
            debouncedQuery !== searchQuery
          }
          isError={searchResults.isError}
          onRetry={() => searchResults.refetch()}
          onFavorite={handleFavorite}
          onOpen={openRecipe}
        />
      ) : (
        <TieredView
          items={listQuery.data?.items ?? []}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          onRetry={() => listQuery.refetch()}
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setShowAll(false);
          }}
          showAll={showAll}
          onShowAll={() => setShowAll(true)}
          foldPlans={foldPlans}
          onToggleFold={() => setFoldPlans((v) => !v)}
          promotedId={promotedId}
          onFavorite={handleFavorite}
          onOpen={openRecipe}
          onGenerate={() => setGenerateOpen(true)}
          onImport={() => setImportOpen(true)}
        />
      )}

      {toast && (
        <div
          role="status"
          data-testid="recipe-toast"
          className="fixed left-1/2 -translate-x-1/2 z-50 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] glass-sheet rounded-full px-4 py-2 text-xs font-medium shadow-[0_18px_46px_-14px_rgba(0,0,0,0.75)]"
        >
          {toast}
        </div>
      )}

      <RecipeToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onGenerate={() => setGenerateOpen(true)}
        onImport={() => setImportOpen(true)}
      />

      <GenerateRecipeDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={onCreated}
      />
      <ImportRecipeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onCreated}
      />
    </>
  );
}

type TieredViewProps = {
  items: RecipeListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  filter: RecipeFilter;
  onFilterChange: (f: RecipeFilter) => void;
  showAll: boolean;
  onShowAll: () => void;
  foldPlans: boolean;
  onToggleFold: () => void;
  promotedId: string | null;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onOpen: (id: string) => void;
  onGenerate: () => void;
  onImport: () => void;
};

function TieredView({
  items,
  isLoading,
  isError,
  onRetry,
  filter,
  onFilterChange,
  showAll,
  onShowAll,
  foldPlans,
  onToggleFold,
  promotedId,
  onFavorite,
  onOpen,
  onGenerate,
  onImport,
}: TieredViewProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorCard onRetry={onRetry} />;
  if (items.length === 0)
    return <EmptyLibrary onGenerate={onGenerate} onImport={onImport} />;

  const lib = items.filter((r) => !isPlanDraft(r));
  const drafts = items.filter(isPlanDraft);
  const favs = lib.filter((r) => r.isFavorite);
  const cooked = lib
    .filter((r) => r.lastCookedAt != null)
    .sort(
      (a, b) =>
        new Date(b.lastCookedAt as Date).getTime() -
        new Date(a.lastCookedAt as Date).getTime()
    );

  const list = filter === "fav" ? favs : filter === "cooked" ? cooked : lib;
  const shown = showAll ? list : list.slice(0, PAGE_SIZE);
  const rest = list.length - shown.length;

  return (
    <div className="space-y-5 pb-40">
      <CookedStrip recipes={cooked} onOpen={onOpen} />

      <RecipeFilters
        active={filter}
        counts={{ all: lib.length, fav: favs.length, cooked: cooked.length }}
        onChange={onFilterChange}
      />

      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {filter === "fav"
            ? "No favorites yet — tap the heart on a recipe to keep it here."
            : "Nothing cooked yet."}
        </p>
      ) : (
        <div className="space-y-3" data-testid="library-list">
          {shown.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              badge={r.lastCookedAt ? "cooked" : null}
              promoted={promotedId === r.id}
              onFavorite={onFavorite}
              onClick={onOpen}
            />
          ))}
          {rest > 0 && (
            <button
              type="button"
              onClick={onShowAll}
              data-testid="show-more"
              className="w-full text-center text-xs text-primary py-2 cursor-pointer"
            >
              Show {rest} more
            </button>
          )}
        </div>
      )}

      <PlanDraftsShelf
        drafts={drafts}
        collapsed={foldPlans}
        onToggle={onToggleFold}
        promotedId={promotedId}
        onFavorite={onFavorite}
        onOpen={onOpen}
      />
    </div>
  );
}

type SearchResultsProps = {
  results: RecipeListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onOpen: (id: string) => void;
};

function SearchResults({
  results,
  isLoading,
  isError,
  onRetry,
  onFavorite,
  onOpen,
}: SearchResultsProps) {
  return (
    <div className="space-y-3 pb-40">
      <p className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-muted-foreground/75">
        Search results
      </p>
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorCard onRetry={onRetry} />
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recipes found</p>
      ) : (
        results.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            badge={r.lastCookedAt ? "cooked" : isPlanDraft(r) ? "draft" : null}
            onFavorite={onFavorite}
            onClick={onOpen}
          />
        ))
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-4 h-20 animate-pulse opacity-30" />
      ))}
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center space-y-3">
      <p className="text-sm text-muted-foreground">Couldn&apos;t load your recipes</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyLibrary({
  onGenerate,
  onImport,
}: {
  onGenerate: () => void;
  onImport: () => void;
}) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center space-y-4">
      <p className="text-sm text-muted-foreground">Your recipe library is empty</p>
      <p className="text-xs text-muted-foreground/60">
        Ask your chef to generate something, or import a recipe from the web.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onGenerate}>
          Generate
        </Button>
        <Button size="sm" variant="outline" onClick={onImport}>
          Import
        </Button>
      </div>
    </div>
  );
}

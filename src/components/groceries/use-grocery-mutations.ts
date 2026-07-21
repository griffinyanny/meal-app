"use client";

import { trpc, type RouterOutputs } from "@/lib/trpc";
import type { GroceryCategory } from "@/lib/grocery-categories";

export type GroceryData = NonNullable<RouterOutputs["grocery"]["current"]>;
export type GroceryItem = GroceryData["items"][number];

// Optimistic grocery mutations. Same shape as Plan's optimistic writes
// (use-plan-modify / the feedback mutation): cancel in-flight fetches, patch the
// grocery.current cache immediately, roll back the snapshot on error, and
// invalidate on settle to reconcile. Check-off, add, edit, reorder and clear all
// feel instant; split re-fetches (a merged row becomes several) and tidy patches
// the row once the AI categorization lands.
export function useGroceryMutations(listId: string) {
  const utils = trpc.useUtils();

  const patch = (fn: (old: GroceryData) => GroceryData) =>
    utils.grocery.current.setData(undefined, (old) => (old ? fn(old) : old));

  const snapshot = async () => {
    await utils.grocery.current.cancel();
    return utils.grocery.current.getData();
  };
  const rollback = (prev: GroceryData | null | undefined) => {
    if (prev !== undefined) utils.grocery.current.setData(undefined, prev);
  };
  const invalidate = () => utils.grocery.current.invalidate();

  const tidyMutation = trpc.grocery.tidyItem.useMutation({
    onSettled: () => invalidate(),
  });

  const checkMutation = trpc.grocery.checkItem.useMutation({
    onMutate: async ({ itemId, isChecked }) => {
      const prev = await snapshot();
      patch((old) => ({
        ...old,
        items: old.items.map((i) => (i.id === itemId ? { ...i, isChecked } : i)),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const addMutation = trpc.grocery.addItem.useMutation({
    onMutate: async (vars) => {
      const prev = await snapshot();
      const tempId = crypto.randomUUID();
      const now = new Date();
      const temp: GroceryItem = {
        id: tempId,
        householdId: "",
        listId: vars.listId,
        name: vars.name,
        rawName: vars.name,
        quantity: null,
        unit: null,
        category: vars.category ?? "other",
        sourceType: "manual",
        sourceRecipeId: null,
        sources: [],
        packageLabel: null,
        isChecked: false,
        checkedBy: null,
        // Sort after everything already on the list.
        position: (prev?.items.length ?? 0) + 1000,
        createdAt: now,
        updatedAt: now,
      };
      patch((old) => ({ ...old, items: [...old.items, temp] }));
      return { prev, tempId };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSuccess: (real, _vars, ctx) => {
      // Swap the temp row for the persisted one, then let the AI tidy refine its
      // category in the background (it re-homes the row to the right aisle).
      patch((old) => ({
        ...old,
        items: old.items.map((i) => (i.id === ctx?.tempId ? real : i)),
      }));
      tidyMutation.mutate({ itemId: real.id });
    },
  });

  const removeMutation = trpc.grocery.removeItem.useMutation({
    onMutate: async ({ itemId }) => {
      const prev = await snapshot();
      patch((old) => ({ ...old, items: old.items.filter((i) => i.id !== itemId) }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const editMutation = trpc.grocery.editItem.useMutation({
    onMutate: async (vars) => {
      const prev = await snapshot();
      // Name is patched instantly; the parsed quantity arrives on invalidate.
      if (vars.name !== undefined) {
        patch((old) => ({
          ...old,
          items: old.items.map((i) =>
            i.id === vars.itemId ? { ...i, name: vars.name! } : i
          ),
        }));
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const splitMutation = trpc.grocery.splitItem.useMutation({
    // A merged row becomes N rows — too structural to patch cleanly; re-fetch.
    onSettled: () => invalidate(),
  });

  const clearCheckedMutation = trpc.grocery.clearChecked.useMutation({
    onMutate: async () => {
      const prev = await snapshot();
      patch((old) => ({ ...old, items: old.items.filter((i) => !i.isChecked) }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const organizeModeMutation = trpc.grocery.setOrganizeMode.useMutation({
    onMutate: async ({ mode }) => {
      const prev = await snapshot();
      patch((old) => ({ ...old, organizeMode: mode }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const reorderSectionsMutation = trpc.grocery.reorderSections.useMutation({
    onMutate: async ({ aisleOrder }) => {
      const prev = await snapshot();
      patch((old) => ({ ...old, aisleOrder }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  const reorderItemsMutation = trpc.grocery.reorderItems.useMutation({
    onMutate: async ({ orderedIds }) => {
      const prev = await snapshot();
      const rank = new Map(orderedIds.map((id, i) => [id, i]));
      patch((old) => ({
        ...old,
        items: old.items.map((i) =>
          rank.has(i.id) ? { ...i, position: rank.get(i.id)! } : i
        ),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.prev),
    onSettled: () => invalidate(),
  });

  return {
    toggleCheck: (itemId: string, isChecked: boolean) =>
      checkMutation.mutate({ itemId, isChecked }),
    addItem: (name: string, category: GroceryCategory) =>
      addMutation.mutate({ listId, name, category }),
    removeItem: (itemId: string) => removeMutation.mutate({ itemId }),
    editItem: (itemId: string, patch: { name?: string; qtyText?: string }) =>
      editMutation.mutate({ itemId, ...patch }),
    splitItem: (itemId: string) => splitMutation.mutate({ itemId }),
    clearChecked: () => clearCheckedMutation.mutate({ listId }),
    setOrganizeMode: (mode: "grouped" | "manual") =>
      organizeModeMutation.mutate({ listId, mode }),
    reorderSections: (aisleOrder: GroceryCategory[]) =>
      reorderSectionsMutation.mutate({ listId, aisleOrder }),
    reorderItems: (orderedIds: string[]) =>
      reorderItemsMutation.mutate({ listId, orderedIds }),
  };
}

export type GroceryActions = ReturnType<typeof useGroceryMutations>;

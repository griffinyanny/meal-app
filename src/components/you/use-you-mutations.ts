"use client";

import { trpc, type RouterInputs, type RouterOutputs } from "@/lib/trpc";

export type Memory = RouterOutputs["user"]["memories"][number];

// The single query input the ledger uses. Shared so the query and every
// optimistic setData/invalidate key on the exact same input (React Query keys by
// deep-equal input — a mismatched object would silently miss the cache).
export const MEMORIES_QUERY_INPUT = { activeOnly: true, limit: 100 } as const;

// Exactly what updatePreferences accepts (dietaryFramework is the enum, not a bare
// string) — sourced from the router so the two can't drift.
export type PreferencesPatch = RouterInputs["user"]["updatePreferences"];

// Optimistic You-tab writes. Same discipline as use-grocery-mutations: cancel
// in-flight fetches, patch the cache immediately, roll back on error, reconcile on
// settle. Preference edits (chips / steppers / picker) and memory removals feel
// instant; the caller owns the undo toast (it captures before-state and calls
// these again to reverse).
export function useYouMutations() {
  const utils = trpc.useUtils();

  const prefsMutation = trpc.user.updatePreferences.useMutation({
    onMutate: async (patch) => {
      await utils.user.preferences.cancel();
      const prev = utils.user.preferences.getData();
      // Only patch when a row already exists; a first-ever edit (prev === null)
      // is created server-side and reconciled on settle.
      utils.user.preferences.setData(undefined, (old) =>
        old ? { ...old, ...patch } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) utils.user.preferences.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.user.preferences.invalidate(),
  });

  const deactivateMutation = trpc.memory.deactivate.useMutation({
    onMutate: async ({ memoryId }) => {
      await utils.user.memories.cancel(MEMORIES_QUERY_INPUT);
      const prev = utils.user.memories.getData(MEMORIES_QUERY_INPUT);
      utils.user.memories.setData(MEMORIES_QUERY_INPUT, (old) =>
        old?.filter((m) => m.id !== memoryId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined)
        utils.user.memories.setData(MEMORIES_QUERY_INPUT, ctx.prev);
    },
    onSettled: () => utils.user.memories.invalidate(MEMORIES_QUERY_INPUT),
  });

  const reactivateMutation = trpc.memory.reactivate.useMutation({
    // Cancel any in-flight memories fetch first so a stale pre-undo response can't
    // land after this reactivation (the talk-undo path fires this right after
    // talk's own invalidate — same race class reAddMemory guards against).
    onMutate: () => utils.user.memories.cancel(MEMORIES_QUERY_INPUT),
    onSettled: () => utils.user.memories.invalidate(MEMORIES_QUERY_INPUT),
  });

  return {
    setPreferences: (patch: PreferencesPatch) => prefsMutation.mutate(patch),
    deactivateMemory: (memoryId: string) => deactivateMutation.mutate({ memoryId }),
    // Undo of a talk-capture forget (id only, no row in hand) — a refetch brings it
    // back.
    reactivateMemory: (memoryId: string) => reactivateMutation.mutate({ memoryId }),
    // Undo of a ledger removal — re-insert the row optimistically (instant + race-
    // free against the removal's in-flight refetch) and reconcile.
    reAddMemory: (memory: Memory) => {
      utils.user.memories.setData(MEMORIES_QUERY_INPUT, (old) => {
        if (!old || old.some((m) => m.id === memory.id)) return old;
        return [...old, memory].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      reactivateMutation.mutate({ memoryId: memory.id });
    },
  };
}

export type YouActions = ReturnType<typeof useYouMutations>;

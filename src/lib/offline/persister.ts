import { get, set, del } from "idb-keyval";
import superjson from "superjson";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import type { Query } from "@tanstack/react-query";

// React Query cache persistence to IndexedDB (1F/C) — the DATA half of offline.
//
// ⚠️ A service worker structurally cannot do this job. The list arrives over
// `httpBatchLink`, which is a POST, and the Cache API rejects `Cache.put` on a
// non-GET request. Cache the shell and stop there and you get an app that opens
// instantly in a shop and shows an EMPTY list — a failure in exactly the moment
// the feature exists for. `public/sw.js` caches the shell; this file carries the
// data. Two mechanisms, no overlap.

const IDB_KEY = "meal-app-query-cache";

// ⚠️ Bump on any change to what a persisted query RETURNS. Hydration replays
// stored bytes into today's components, so a shape change without a bump means
// last week's payload rendering against code that expects a new field — a crash
// on launch, offline, with no way to clear it from inside the app.
export const OFFLINE_BUSTER = "1";

// A week. The list is a weekly object, so a persisted copy stops being the
// current shop at roughly the same cadence the plan does. This only bounds how
// stale an OFFLINE read can be: online, React Query refetches over the top.
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * ⚠️ superjson, not JSON — and this is a correctness fix, not a preference.
 *
 * `grocery.current` returns Drizzle rows: `createdAt` and `updatedAt` are real
 * `Date` objects, and the tRPC client already transports them through superjson
 * for exactly that reason. Persist with `JSON.stringify` and they come back as
 * STRINGS, so a hydrated list is subtly a different type from a fetched one —
 * `.getTime()` throws, comparisons silently do the wrong thing, and it only
 * ever happens offline, on a phone, where nobody is reading a console.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, superjson.stringify(client));
    },
    restoreClient: async () => {
      const stored = await get<string>(IDB_KEY);
      if (!stored) return undefined;
      try {
        return superjson.parse<PersistedClient>(stored);
      } catch {
        // Unparseable means a superjson version change or a partial write. Drop
        // it rather than throwing: a corrupt cache must degrade to "no offline
        // data", never to "the app will not boot".
        await del(IDB_KEY);
        return undefined;
      }
    },
    removeClient: async () => {
      await del(IDB_KEY);
    },
  };
}

// ⚠️ An ALLOW-LIST, deliberately, and the reasoning is BUG-018's.
//
// Persisting the whole cache is one line shorter and writes the household's
// entire life to unencrypted on-device storage: the plan, every recipe, the
// chef's memories about the family, the onboarding health answers. The offline
// scope Griffin agreed is the GROCERY LIST — read it in a shop, tick it in a
// shop. Anything past that is data at rest we never decided to keep.
//
// A deny-list fails open: add a router tomorrow and it is persisted by default,
// silently, and the first time anyone notices is when it holds something it
// should not. This fails closed — a new query is not persisted until someone
// names it here.
const PERSISTED_QUERY_PREFIXES = [["grocery", "current"], ["staples", "list"]];

function matchesPrefix(queryKey: readonly unknown[], prefix: string[]): boolean {
  // tRPC keys are shaped [["grocery","current"], {...}] — the path is nested.
  const path = Array.isArray(queryKey[0]) ? (queryKey[0] as unknown[]) : queryKey;
  return prefix.every((segment, i) => path[i] === segment);
}

/**
 * Decides what survives a cold launch. Only successful queries on the allow-list
 * above — an errored query is not a cache, it is a failure we would be replaying
 * into a shop.
 */
export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  return PERSISTED_QUERY_PREFIXES.some((prefix) => matchesPrefix(query.queryKey, prefix));
}

// ── The queued check-off ─────────────────────────────────────────────────────
//
// ⚠️ READ THIS BEFORE CHANGING WHAT IS PERSISTED. Persisting the query cache
// alone is NOT the smaller, safer half of this feature — it is an illusion of
// saved work, and it is worse than shipping nothing.
//
// `onMutate` writes the tick into the cache optimistically and the query stays
// `status: "success"`, so the ticked list gets persisted. Persist only that and
// the sequence is: tick five items in a shop → iOS evicts the backgrounded PWA
// (which it does aggressively, over a 45-minute shop, with the phone in a
// pocket) → relaunch → THE TICKS ARE STILL THERE, because they were persisted →
// finish shopping → signal returns → the server refetch wipes all five, because
// the mutations that would have saved them died with the process.
//
// The user watched their work survive a relaunch and reasonably concluded it was
// saved. That is Griffin's own rejected case ("not less feature, an app that
// looks broken") with a longer fuse. So the mutation has to be persisted
// alongside the optimistic state it produced, or neither should be.
//
// React Query forces the choice either way: `defaultShouldDehydrateMutation` is
// `(m) => m.state.isPaused`, so paused mutations are persisted BY DEFAULT — and
// a restored mutation whose `mutationFn` lives in an unmounted component has no
// way to run. Hence the defaults registered below.
const OFFLINE_MUTATION_PATHS = [
  // Check-off only, which is the scope Griffin widened to in S59: in a shop the
  // verb is TICK. Adding an item offline is a different question — `addItem`
  // runs an AI categorize pass that cannot work without a network — so it is
  // deliberately not here. One line to add another once it has an answer.
  ["grocery", "checkItem"],
] as const;

/** Mirrors `shouldDehydrateQuery`: only paused mutations we can actually replay. */
export function shouldDehydrateMutation(mutation: {
  state: { isPaused: boolean };
  options: { mutationKey?: readonly unknown[] };
}): boolean {
  if (!mutation.state.isPaused) return false;
  const key = mutation.options.mutationKey;
  if (!key) return false;
  return OFFLINE_MUTATION_PATHS.some((path) => matchesPrefix(key, [...path]));
}

type MutationRegistrar = {
  setMutationDefaults: (key: readonly unknown[], options: Record<string, unknown>) => void;
};
type GroceryClient = { grocery: { checkItem: { mutate: (input: never) => Promise<unknown> } } };

/**
 * Gives every offline-replayable mutation a `mutationFn` that lives on the
 * QueryClient rather than in a component.
 *
 * ⚠️ This is what makes a restored mutation runnable. After a cold start the
 * component that originally called `useMutation` has never mounted, so the
 * mutation React Query rehydrates knows its key and its variables and nothing
 * about how to execute itself. Without this it resumes into `undefined` and the
 * tick is lost silently — the exact failure the persistence was added to stop.
 */
export function registerOfflineMutationDefaults(
  queryClient: MutationRegistrar & { invalidateQueries: (f: Record<string, unknown>) => void },
  trpcClient: GroceryClient
): void {
  queryClient.setMutationDefaults([["grocery", "checkItem"]], {
    mutationFn: (input: never) => trpcClient.grocery.checkItem.mutate(input),
    // The component's own `onSettled` invalidate cannot fire for a replayed
    // mutation, so reconcile here too. Harmless when it double-fires online.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [["grocery", "current"]] });
    },
  });
}

/**
 * Drops everything offline holds: the persisted query cache AND the service
 * worker's shell cache. Call on sign-out — the cached shell is server-rendered
 * with real household content in it, so neither half is safe to leave behind.
 */
export async function clearOfflineState(): Promise<void> {
  await del(IDB_KEY);

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage("clear-caches");
  }
}

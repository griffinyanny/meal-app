"use client";

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import {
  OFFLINE_BUSTER,
  OFFLINE_MAX_AGE_MS,
  createIDBPersister,
  registerOfflineMutationDefaults,
  shouldDehydrateMutation,
  shouldDehydrateQuery,
} from "@/lib/offline/persister";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export type TRPCProviderProps = {
  children: React.ReactNode;
};

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            // ⚠️ Must be >= the persisted `maxAge`, or the in-memory cache
            // evicts a query before persistence ever gets to matter and the
            // offline read silently degrades to an empty list. React Query
            // garbage-collects at 5 minutes by default, which is shorter than
            // a walk to the shop. Refetch behaviour is unchanged — `staleTime`
            // still governs that; this only governs eviction.
            gcTime: OFFLINE_MAX_AGE_MS,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  const [persistOptions] = useState(() => {
    // Registered once, beside the client that can actually execute them. A
    // mutation restored after a cold start has no component to get a
    // `mutationFn` from — see the note in `persister.ts`.
    registerOfflineMutationDefaults(queryClient, trpcClient);

    return {
      persister: createIDBPersister(),
      maxAge: OFFLINE_MAX_AGE_MS,
      buster: OFFLINE_BUSTER,
      dehydrateOptions: { shouldDehydrateQuery, shouldDehydrateMutation },
    };
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        // Flush anything that was ticked offline and outlived the process.
        // Without this the mutations restore in a paused state and sit there
        // until something else happens to wake them.
        onSuccess={() => queryClient.resumePausedMutations()}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}

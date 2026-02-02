import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export function setupOfflineSupport(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
  });

  const [, restorePromise] = persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    dehydrateOptions: {
      shouldDehydrateQuery: (query: { queryKey: unknown }) => Array.isArray(query.queryKey),
    },
  });

  void restorePromise
    .then(() => {
      const cache = queryClient.getQueryCache();
      cache.getAll().forEach((query) => {
        if (!Array.isArray(query.queryKey)) {
          cache.remove(query);
        }
      });
    })
    .catch(() => {
      // Ignore restore errors; queries will rehydrate on next successful persist.
    });
}

// Queries that should be cached offline
export const offlineQueries: string[] = [
  "settings",
  "user-preferences",
  "products",
  "jobs",
];

export function isOfflineQuery(queryKey: readonly unknown[]): boolean {
  const firstPart: unknown = queryKey[0];
  return typeof firstPart === "string" && offlineQueries.includes(firstPart);
}

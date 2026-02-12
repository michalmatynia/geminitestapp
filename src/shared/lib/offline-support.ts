import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';
import { persistQueryClient, type PersistedClient } from '@tanstack/react-query-persist-client';

import { QUERY_KEYS } from './query-keys';

export function setupOfflineSupport(queryClient: QueryClient): void {
  if (typeof window === 'undefined') return;

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    deserialize: (cachedString: string): PersistedClient => {
      const parsed = JSON.parse(cachedString) as {
        clientState?: { queries?: Array<Record<string, unknown>> };
      };
      const queries = parsed?.clientState?.queries;
      if (Array.isArray(queries)) {
        parsed.clientState!.queries = queries
          .filter((query: Record<string, unknown>) => query?.['state'] && (query['state'] as { status?: string }).status === 'success')
          .map((query: Record<string, unknown>) => {
            if (query && typeof query === 'object' && 'promise' in query) {
              const { promise: _ignored, ...rest } = query;
              return rest;
            }
            return query;
          })
          // Drop any persisted queries with non-array keys (legacy v3 format)
          .filter((query: Record<string, unknown>) => Array.isArray(query?.['queryKey']));
      }
      return parsed as unknown as PersistedClient;
    },
  });

  const [, restorePromise] = persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) =>
        Array.isArray(query.queryKey) && query.state.status === 'success',
    },
  });

  void restorePromise
    .then(() => {
      const cache = queryClient.getQueryCache();
      cache.getAll().forEach((query: Query) => {
         
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
  QUERY_KEYS.settings.all[0],
  QUERY_KEYS.userPreferences[0],
  QUERY_KEYS.products.all[0],
  QUERY_KEYS.jobs.all[0],
];

export function isOfflineQuery(queryKey: readonly unknown[]): boolean {
  const firstPart: unknown = queryKey[0];
  return typeof firstPart === 'string' && offlineQueries.includes(firstPart);
}

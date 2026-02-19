import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient, type PersistedClient } from '@tanstack/react-query-persist-client';

import { QUERY_KEYS } from './query-keys';

const shouldPersistQuery = (
  queryKey: unknown,
  status: unknown
): boolean => status === 'success' && isOfflineQueryKey(queryKey);

const isOfflineQueryKey = (queryKey: unknown): boolean =>
  Array.isArray(queryKey) && isOfflineQuery(queryKey as readonly unknown[]);

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
          .filter((query: Record<string, unknown>) => {
            const state = query?.['state'] as { status?: unknown } | undefined;
            return shouldPersistQuery(query?.['queryKey'], state?.status);
          })
          .map((query: Record<string, unknown>) => {
            if (query && typeof query === 'object' && 'promise' in query) {
              const { promise: _ignored, ...rest } = query;
              return rest;
            }
            return query;
          });
      }
      return parsed as unknown as PersistedClient;
    },
  });

  const [, restorePromise] = persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && isOfflineQuery(query.queryKey),
    },
  });

  void restorePromise
    .then(() => {})
    .catch(() => {
      // Ignore restore errors; queries will rehydrate on next successful persist.
    });
}

// Queries that should be cached offline
export const offlineQueries: string[] = [
  QUERY_KEYS.settings.all[0],
  QUERY_KEYS.userPreferences.all[0],
  QUERY_KEYS.jobs.all[0],
];

export function isOfflineQuery(queryKey: readonly unknown[]): boolean {
  const firstPart: unknown = queryKey[0];
  return typeof firstPart === 'string' && offlineQueries.includes(firstPart);
}

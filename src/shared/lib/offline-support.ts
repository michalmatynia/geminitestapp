import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, type DehydratedState } from '@tanstack/react-query';
import { persistQueryClient, type PersistedClient } from '@tanstack/react-query-persist-client';

import { QUERY_KEYS } from './query-keys';

const shouldPersistQuery = (queryKey: unknown, status: unknown): boolean =>
  status === 'success' && isOfflineQueryKey(queryKey);

const isOfflineQueryKey = (queryKey: unknown): boolean =>
  Array.isArray(queryKey) && isOfflineQuery(queryKey as readonly unknown[]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function setupOfflineSupport(queryClient: QueryClient): void {
  if (typeof window === 'undefined') return;

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    deserialize: (cachedString: string): PersistedClient => {
      const parsed = JSON.parse(cachedString) as Partial<PersistedClient>;
      const parsedClientState = isRecord(parsed.clientState)
        ? (parsed.clientState as Partial<DehydratedState>)
        : {};
      const queries = Array.isArray(parsedClientState.queries) ? parsedClientState.queries : [];
      const mutations = Array.isArray(parsedClientState.mutations)
        ? parsedClientState.mutations
        : [];
      const filteredQueries = queries
        .filter((query) => {
          if (!isRecord(query)) return false;
          const state = isRecord(query['state']) ? query['state'] : null;
          return shouldPersistQuery(query['queryKey'], state?.['status']);
        })
        .map((query) => query);

      return {
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
        buster: typeof parsed.buster === 'string' ? parsed.buster : '',
        clientState: {
          queries: filteredQueries,
          mutations,
        },
      };
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

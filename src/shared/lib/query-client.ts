import { QueryClient, QueryCache, MutationCache, type Query } from '@tanstack/react-query';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { isOfflineQuery } from './offline-support';

/**
 * Standardized QueryClient configuration for the application.
 * Centralizes error logging, retry policies, and caching strategies.
 */
export const createQueryClient = () => {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: Error, query: Query) => {
        logClientError(error, {
          context: {
            source: 'QueryCache',
            queryKey: query.queryKey,
            state: query.state,
            level: 'error',
          },
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: Error, _variables, _context, mutation) => {
        logClientError(error, {
          context: {
            source: 'MutationCache',
            mutationKey: mutation.options.mutationKey,
            state: mutation.state,
            level: 'error',
          },
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: (query: Query): number => {
          // Longer stale time for offline-cached queries
          return isOfflineQuery(query.queryKey) ? 1000 * 60 * 30 : 1000 * 60 * 5;
        },
        gcTime: 1000 * 60 * 60 * 24, // 24 hours for offline support
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: false,
        refetchIntervalInBackground: false,
        retry: (failureCount: number, error: unknown): boolean => {
          // Don't retry for 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) return false;
          }
          // Bounded retries for 5xx/network/timeouts
          return failureCount < 2;
        },
        retryDelay: (attemptIndex: number): number => Math.min(1000 * 2 ** attemptIndex, 30000),
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: (failureCount: number, error: unknown): boolean => {
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) return false;
          }
          return failureCount < 1;
        },
        networkMode: 'online',
      },
    },
  });
};

// Export a singleton instance if needed, but standard practice in Next.js 
// is often to create it in a provider to ensure it's not shared between requests in RSC
// but for client-side use, a factory or stable instance is fine.

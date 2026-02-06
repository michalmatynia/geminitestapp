import {
  QueryClient,
  QueryClientConfig,
} from '@tanstack/react-query';

const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
};

export const createQueryClient = (): QueryClient => new QueryClient(queryConfig);

let clientSingleton: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return createQueryClient();
  }

  // Browser: create a client once per app
  if (!clientSingleton) {
    clientSingleton = createQueryClient();
  }

  return clientSingleton;
}

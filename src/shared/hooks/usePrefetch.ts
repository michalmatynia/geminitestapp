import { useQueryClient } from '@tanstack/react-query';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

export interface SmartPrefetchResult {
  prefetchOnHover: (
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ) => { onMouseEnter: () => void };
  prefetchOnFocus: (
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ) => { onFocus: () => void };
}

// Smart prefetching based on user behavior
export function useSmartPrefetch(options?: {
  domain?: TanstackFactoryDomain;
}): SmartPrefetchResult {
  const queryClient = useQueryClient();
  const domain = options?.domain ?? 'global';

  const prefetchOnHover = (
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ): { onMouseEnter: () => void } => {
    return {
      onMouseEnter: (): void => {
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn,
          meta: {
            source: 'shared.hooks.useSmartPrefetch.onHover',
            operation: 'list',
            resource: 'smart-prefetch',
            domain,
            tags: ['prefetch', 'hover'],
          },
        })();
      },
    };
  };

  const prefetchOnFocus = (
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ): { onFocus: () => void } => {
    return {
      onFocus: (): void => {
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn,
          meta: {
            source: 'shared.hooks.useSmartPrefetch.onFocus',
            operation: 'list',
            resource: 'smart-prefetch',
            domain,
            tags: ['prefetch', 'focus'],
          },
        })();
      },
    };
  };

  return {
    prefetchOnHover,
    prefetchOnFocus,
  };
}

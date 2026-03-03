import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

interface PrefetchConfig {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  condition?: () => boolean;
  delay?: number;
}

export function usePrefetchQueries(
  configs: PrefetchConfig[],
  options?: { domain?: TanstackFactoryDomain }
): void {
  const queryClient = useQueryClient();
  const domain = options?.domain ?? 'global';

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    configs.forEach(({ queryKey, queryFn, condition, delay = 0 }: PrefetchConfig): void => {
      if (condition && !condition()) return;

      const timeoutId = setTimeout(() => {
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn,
          staleTime: 1000 * 60 * 5, // 5 minutes
          meta: {
            source: 'shared.hooks.usePrefetchQueries',
            operation: 'list',
            resource: 'prefetch',
            domain,
            tags: ['prefetch'],
          },
        })();
      }, delay);

      timeouts.push(timeoutId);
    });

    return (): void => timeouts.forEach((t: NodeJS.Timeout) => clearTimeout(t));
  }, [configs, queryClient, domain]);
}

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
export function useSmartPrefetch(options?: { domain?: TanstackFactoryDomain }): SmartPrefetchResult {
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

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProductsWithCount } from '@/features/products/api/products';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/**
 * Hook for prefetching critical admin data during navigation intent (e.g. hover).
 * This fills the TanStack Query cache BEFORE the page component mounts,
 * making the eventual page load feel instant.
 */
export function useAdminDataPrefetch() {
  const queryClient = useQueryClient();

  const prefetchProducts = useCallback(() => {
    const filters = { page: 1, pageSize: 20 };
    const queryKey = [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;

    void prefetchQueryV2(queryClient, {
      queryKey,
      queryFn: async (context) => {
        const data = await getProductsWithCount(filters, context.signal);
        // We don't need to parse it here, the factory meta will handle it if we used the standard hook,
        // but here we just want to prime the cache with raw data that the component will then parse.
        return { items: data.products, total: data.total };
      },
      staleTime: 60_000,
      meta: {
        source: 'useAdminDataPrefetch.products',
        operation: 'list',
        resource: 'products.paged',
        domain: 'products',
        tags: ['prefetch', 'navigation'],
      },
    })();
  }, [queryClient]);

  const prefetchDashboard = useCallback(() => {
    // Health status
    void prefetchQueryV2(queryClient, {
      queryKey: QUERY_KEYS.health.status(),
      queryFn: async (): Promise<unknown> => await fetch('/api/health').then(r => r.json()),
      staleTime: 30_000,
      meta: {
        source: 'useAdminDataPrefetch.dashboard.health',
        operation: 'detail',
        resource: 'health',
        domain: 'global',
      },
    })();

    // System activity
    const activityFilters = { pageSize: 5 };
    void prefetchQueryV2(queryClient, {
      queryKey: [...QUERY_KEYS.system.activity.lists(), activityFilters],
      queryFn: async (): Promise<unknown> => await fetch('/api/system/activity?pageSize=5').then(r => r.json()),
      staleTime: 30_000,
      meta: {
        source: 'useAdminDataPrefetch.dashboard.activity',
        operation: 'list',
        resource: 'system.activity',
        domain: 'global',
      },
    })();
  }, [queryClient]);

  const prefetchByHref = useCallback((href: string) => {
    if (href === '/admin/products') {
      prefetchProducts();
    } else if (href === '/admin') {
      prefetchDashboard();
    }
    // Add more prefetch targets as needed
  }, [prefetchDashboard, prefetchProducts]);

  return {
    prefetchProducts,
    prefetchDashboard,
    prefetchByHref,
  };
}

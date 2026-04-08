'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProductsWithCount } from '@/features/products/api/products';
import { loadProductColumns } from '@/features/products/components/list/product-columns-loader';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
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

    // Prefetch JS chunk for columns
    void loadProductColumns();

    // Prefetch Metadata (Catalogs & Price Groups)
    void prefetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.catalogs()),
      queryFn: async (): Promise<unknown> => await fetch('/api/v2/products/entities/catalogs').then((r) => r.json()),
      staleTime: 1000 * 60 * 5,
      meta: {
        source: 'useAdminDataPrefetch.products.metadata.catalogs',
        operation: 'list',
        resource: 'products.metadata.catalogs',
        domain: 'products',
      },
    })();

    void prefetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.priceGroups()),
      queryFn: async (): Promise<unknown> => await fetch('/api/v2/products/metadata/price-groups').then((r) => r.json()),
      staleTime: 1000 * 60 * 5,
      meta: {
        source: 'useAdminDataPrefetch.products.metadata.priceGroups',
        operation: 'list',
        resource: 'products.metadata.price-groups',
        domain: 'products',
      },
    })();

    void prefetchQueryV2(queryClient, {
      queryKey,
      queryFn: async (context) => {
        const data = await getProductsWithCount(filters, context.signal);
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

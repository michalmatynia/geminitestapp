'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import { getProductsWithCount } from '@/features/products/api/products';
import { loadProductColumns } from '@/features/products/components/list/product-columns-loader';
import { fetchAiPathsSettingsCached } from '@/shared/lib/ai-paths/settings-store-client';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { studioKeys } from '@/shared/lib/query-key-exports';
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
        description: 'Prefetch product catalogs for admin navigation intent',
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
        description: 'Prefetch product price groups for admin navigation intent',
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
        description: 'Prefetch first page of products for admin navigation intent',
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
        description: 'Prefetch health status for dashboard navigation intent',
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
        description: 'Prefetch recent system activity for dashboard navigation intent',
      },
    })();
  }, [queryClient]);

  const prefetchByHref = useCallback((href: string) => {
    if (href === '/admin/products') {
      prefetchProducts();
    } else if (href === '/admin') {
      prefetchDashboard();
    } else if (href === '/admin/integrations') {
      void prefetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(QUERY_KEYS.integrations.lists()),
        queryFn: async (): Promise<unknown> => await fetch('/api/v2/integrations').then((r) => r.json()),
        staleTime: 60_000,
        meta: {
          source: 'useAdminDataPrefetch.integrations',
          operation: 'list',
          resource: 'integrations',
          domain: 'integrations',
          description: 'Prefetch integrations list for navigation intent',
        },
      })();
    } else if (href === '/admin/cms' || href === '/admin/cms/pages') {
      void prefetchQueryV2(queryClient, {
        queryKey: QUERY_KEYS.cms.pages.all,
        queryFn: async (): Promise<unknown> => await fetch('/api/v2/cms/pages').then((r) => r.json()),
        staleTime: 60_000,
        meta: {
          source: 'useAdminDataPrefetch.cms',
          operation: 'list',
          resource: 'cms.pages',
          domain: 'cms',
          description: 'Prefetch CMS pages list for navigation intent',
        },
      })();
    } else if (href === '/admin/image-studio') {
      void prefetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(studioKeys.projects()),
        queryFn: fetchStudioProjects,
        staleTime: 60_000,
        meta: {
          source: 'useAdminDataPrefetch.image-studio',
          operation: 'list',
          resource: 'image-studio.projects',
          domain: 'ai',
          description: 'Prefetch image studio projects for navigation intent',
        },
      })();
    } else if (href === '/admin/ai-paths') {
      void prefetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(QUERY_KEYS.ai.aiPaths.settings()),
        queryFn: async (): Promise<unknown> => await fetchAiPathsSettingsCached({ bypassCache: true }),
        staleTime: 60_000,
        meta: {
          source: 'useAdminDataPrefetch.ai-paths',
          operation: 'list',
          resource: 'ai-paths',
          domain: 'ai',
          description: 'Prefetch AI paths settings for navigation intent',
        },
      })();
    }
    // Add more prefetch targets as needed
  }, [prefetchDashboard, prefetchProducts, queryClient]);

  const warmup = useCallback(() => {
    // Background warmup for data that's used across many pages
    void prefetchQueryV2(queryClient, {
      queryKey: QUERY_KEYS.settings.scope('lite'),
      queryFn: async (): Promise<unknown> => await fetch('/api/settings/lite').then((r) => r.json()),
      staleTime: 1000 * 60 * 10,
      meta: {
        source: 'useAdminDataPrefetch.warmup.lite-settings',
        operation: 'list',
        resource: 'settings.lite',
        domain: 'global',
        description: 'Warmup lite settings cache for common page consumption',
      },
    })();
  }, [queryClient]);

  return {
    prefetchProducts,
    prefetchDashboard,
    prefetchByHref,
    warmup,
  };
}

'use client';

import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchStudioProjects } from '@/features/ai/public';
import { getProductsWithCount, loadProductColumns } from '@/features/products';
import { fetchAiPathsSettingsCached } from '@/shared/lib/ai-paths/settings-store-client';
import {
  prefetchQueryV2,
  type EnsureQueryDataV2Config,
} from '@/shared/lib/query-factories-v2';
import { studioKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type AdminDataPrefetchApi = {
  prefetchByHref: (href: string) => void;
  prefetchDashboard: () => void;
  prefetchProducts: () => void;
  warmup: () => void;
};

type PrefetchConfig<TQueryFnData, TQueryKey extends QueryKey = QueryKey> = EnsureQueryDataV2Config<
  TQueryFnData,
  Error,
  TQueryKey
>;

const PRODUCT_FILTERS = { page: 1, pageSize: 20 };
const DASHBOARD_ACTIVITY_FILTERS = { pageSize: 5 };

function runTask(task: Promise<unknown>, action: string): void {
  task.catch((error) => {
    logClientCatch(error, {
      source: 'useAdminDataPrefetch',
      action,
    });
  });
}

function runPrefetch<TQueryFnData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  action: string,
  config: PrefetchConfig<TQueryFnData, TQueryKey>
): void {
  runTask(prefetchQueryV2(queryClient, config)(), action);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  return response.json() as Promise<unknown>;
}

function prefetchProductCatalogs(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'products.metadata.catalogs', {
    queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.catalogs()),
    queryFn: async (): Promise<unknown> => fetchJson('/api/v2/products/entities/catalogs'),
    staleTime: 1000 * 60 * 5,
    meta: {
      source: 'useAdminDataPrefetch.products.metadata.catalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'products',
      description: 'Prefetch product catalogs for admin navigation intent',
    },
  });
}

function prefetchProductPriceGroups(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'products.metadata.price-groups', {
    queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.priceGroups()),
    queryFn: async (): Promise<unknown> => fetchJson('/api/v2/products/metadata/price-groups'),
    staleTime: 1000 * 60 * 5,
    meta: {
      source: 'useAdminDataPrefetch.products.metadata.priceGroups',
      operation: 'list',
      resource: 'products.metadata.price-groups',
      domain: 'products',
      description: 'Prefetch product price groups for admin navigation intent',
    },
  });
}

function prefetchProductsPage(queryClient: QueryClient): void {
  const queryKey = [...QUERY_KEYS.products.lists(), 'paged', { filters: PRODUCT_FILTERS }] as const;

  runPrefetch(queryClient, 'products.paged', {
    queryKey,
    queryFn: async (context) => {
      const data = await getProductsWithCount(PRODUCT_FILTERS, context.signal);
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
  });
}

function prefetchProductsData(queryClient: QueryClient): void {
  runTask(loadProductColumns(), 'products.columns');
  prefetchProductCatalogs(queryClient);
  prefetchProductPriceGroups(queryClient);
  prefetchProductsPage(queryClient);
}

function prefetchHealthStatus(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'dashboard.health', {
    queryKey: QUERY_KEYS.health.status(),
    queryFn: async (): Promise<unknown> => fetchJson('/api/health'),
    staleTime: 30_000,
    meta: {
      source: 'useAdminDataPrefetch.dashboard.health',
      operation: 'detail',
      resource: 'health',
      domain: 'global',
      description: 'Prefetch health status for dashboard navigation intent',
    },
  });
}

function prefetchSystemActivity(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'dashboard.activity', {
    queryKey: [...QUERY_KEYS.system.activity.lists(), DASHBOARD_ACTIVITY_FILTERS],
    queryFn: async (): Promise<unknown> => fetchJson('/api/system/activity?pageSize=5'),
    staleTime: 30_000,
    meta: {
      source: 'useAdminDataPrefetch.dashboard.activity',
      operation: 'list',
      resource: 'system.activity',
      domain: 'global',
      description: 'Prefetch recent system activity for dashboard navigation intent',
    },
  });
}

function prefetchDashboardData(queryClient: QueryClient): void {
  prefetchHealthStatus(queryClient);
  prefetchSystemActivity(queryClient);
}

function prefetchIntegrations(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'integrations.list', {
    queryKey: normalizeQueryKey(QUERY_KEYS.integrations.lists()),
    queryFn: async (): Promise<unknown> => fetchJson('/api/v2/integrations'),
    staleTime: 60_000,
    meta: {
      source: 'useAdminDataPrefetch.integrations',
      operation: 'list',
      resource: 'integrations',
      domain: 'integrations',
      description: 'Prefetch integrations list for navigation intent',
    },
  });
}

function prefetchCmsPages(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'cms.pages', {
    queryKey: QUERY_KEYS.cms.pages.all,
    queryFn: async (): Promise<unknown> => fetchJson('/api/v2/cms/pages'),
    staleTime: 60_000,
    meta: {
      source: 'useAdminDataPrefetch.cms',
      operation: 'list',
      resource: 'cms.pages',
      domain: 'cms',
      description: 'Prefetch CMS pages list for navigation intent',
    },
  });
}

function prefetchImageStudio(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'image-studio.projects', {
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
  });
}

function prefetchAiPaths(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'ai-paths.settings', {
    queryKey: normalizeQueryKey(QUERY_KEYS.ai.aiPaths.settings()),
    queryFn: async (): Promise<unknown> => fetchAiPathsSettingsCached({ bypassCache: true }),
    staleTime: 60_000,
    meta: {
      source: 'useAdminDataPrefetch.ai-paths',
      operation: 'list',
      resource: 'ai-paths',
      domain: 'ai',
      description: 'Prefetch AI paths settings for navigation intent',
    },
  });
}

function prefetchLiteSettings(queryClient: QueryClient): void {
  runPrefetch(queryClient, 'warmup.lite-settings', {
    queryKey: QUERY_KEYS.settings.scope('lite'),
    queryFn: async (): Promise<unknown> => fetchJson('/api/settings/lite'),
    staleTime: 1000 * 60 * 10,
    meta: {
      source: 'useAdminDataPrefetch.warmup.lite-settings',
      operation: 'list',
      resource: 'settings.lite',
      domain: 'global',
      description: 'Warmup lite settings cache for common page consumption',
    },
  });
}

/**
 * Hook for prefetching critical admin data during navigation intent (e.g. hover).
 * This fills the TanStack Query cache BEFORE the page component mounts,
 * making the eventual page load feel instant.
 */
export function useAdminDataPrefetch(): AdminDataPrefetchApi {
  const queryClient = useQueryClient();

  const prefetchProducts = useCallback((): void => {
    prefetchProductsData(queryClient);
  }, [queryClient]);

  const prefetchDashboard = useCallback((): void => {
    prefetchDashboardData(queryClient);
  }, [queryClient]);

  const prefetchByHref = useCallback(
    (href: string): void => {
      switch (href) {
        case '/admin/products':
          prefetchProducts();
          return;
        case '/admin':
          prefetchDashboard();
          return;
        case '/admin/integrations':
          prefetchIntegrations(queryClient);
          return;
        case '/admin/cms':
        case '/admin/cms/pages':
          prefetchCmsPages(queryClient);
          return;
        case '/admin/image-studio':
          prefetchImageStudio(queryClient);
          return;
        case '/admin/ai-paths':
          prefetchAiPaths(queryClient);
          return;
        default:
      }
    },
    [prefetchDashboard, prefetchProducts, queryClient]
  );

  const warmup = useCallback((): void => {
    prefetchLiteSettings(queryClient);
  }, [queryClient]);

  return {
    prefetchByHref,
    prefetchDashboard,
    prefetchProducts,
    warmup,
  };
}

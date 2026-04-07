'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { isMissingProductListingsError } from '@/features/integrations/public';
import { loadProductIntegrationsAdapter } from '@/features/products/lib/product-integrations-adapter-loader';
import { prefetchQueryV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useProductListIntegrations() {
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void loadProductIntegrationsAdapter().then(
      ({
        fetchIntegrationsWithConnections,
        fetchPreferredBaseConnection,
        fetchPreferredTraderaConnection,
        integrationSelectionQueryKeys,
      }) => {
        void prefetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
          queryFn: fetchIntegrationsWithConnections,
          staleTime: 5 * 60 * 1000,
          meta: {
            source: 'products.hooks.useProductListIntegrations.prefetchSelection',
            operation: 'list',
            resource: 'integrations.connections',
            domain: 'integrations',
            tags: ['integrations', 'connections', 'prefetch'],
            description: 'Loads integrations connections.',
          },
        })();
        void prefetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
          queryFn: fetchPreferredBaseConnection,
          staleTime: 5 * 60 * 1000,
          meta: {
            source: 'products.hooks.useProductListIntegrations.prefetchDefault',
            operation: 'detail',
            resource: 'integrations.default-connection',
            domain: 'integrations',
            tags: ['integrations', 'default-connection', 'prefetch'],
            description: 'Loads integrations default connection.',
          },
        })();
        void prefetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
          queryFn: fetchPreferredTraderaConnection,
          staleTime: 5 * 60 * 1000,
          meta: {
            source: 'products.hooks.useProductListIntegrations.prefetchTraderaDefault',
            operation: 'detail',
            resource: 'integrations.tradera-default-connection',
            domain: 'integrations',
            tags: ['integrations', 'tradera', 'default-connection', 'prefetch'],
            description: 'Loads integrations Tradera default connection.',
          },
        })();
      }
    );
  }, [queryClient]);

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
        const queryKey = normalizeQueryKey(productListingsQueryKey(productId));
        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn: () => fetchProductListings(productId),
          staleTime: 30 * 1000,
          logError: false,
          meta: {
            source: 'products.hooks.useProductListIntegrations.prefetchListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            tags: ['integrations', 'listings', 'prefetch'],
            description: 'Loads integrations listings.',
          },
        })().catch((error: unknown) => {
          if (isMissingProductListingsError(error)) {
            queryClient.removeQueries({ queryKey });
            return;
          }
          logClientCatch(error, {
            source: 'products.hooks.useProductListIntegrations',
            action: 'prefetchProductListingsData',
            productId,
            level: 'warn',
          });
        });
      });
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
        const queryKey = normalizeQueryKey(productListingsQueryKey(productId));
        void fetchQueryV2(queryClient, {
          queryKey,
          queryFn: () => fetchProductListings(productId),
          staleTime: 0,
          logError: false,
          meta: {
            source: 'products.hooks.useProductListIntegrations.refreshListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            tags: ['integrations', 'listings', 'fetch'],
            description: 'Loads integrations listings.',
          },
        })().catch((error: unknown) => {
          if (isMissingProductListingsError(error)) {
            queryClient.removeQueries({ queryKey });
            return;
          }
          logClientCatch(error, {
            source: 'products.hooks.useProductListIntegrations',
            action: 'refreshProductListingsData',
            productId,
            level: 'warn',
          });
        });
      });
    },
    [queryClient]
  );

  return {
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
  };
}

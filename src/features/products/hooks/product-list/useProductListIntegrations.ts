'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchQueryV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

type ProductIntegrationsAdapterModule = typeof import('@/shared/lib/product-integrations-adapter');

let productIntegrationsAdapterPromise: Promise<ProductIntegrationsAdapterModule> | null = null;

const loadProductIntegrationsAdapter = (): Promise<ProductIntegrationsAdapterModule> => {
  if (!productIntegrationsAdapterPromise) {
    productIntegrationsAdapterPromise = import('@/shared/lib/product-integrations-adapter');
  }
  return productIntegrationsAdapterPromise;
};

export function useProductListIntegrations() {
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void loadProductIntegrationsAdapter().then(
      ({
        fetchIntegrationsWithConnections,
        fetchPreferredBaseConnection,
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
      }
    );
  }, [queryClient]);

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
        void prefetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
          queryFn: () => fetchProductListings(productId),
          staleTime: 30 * 1000,
          meta: {
            source: 'products.hooks.useProductListIntegrations.prefetchListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            tags: ['integrations', 'listings', 'prefetch'],
            description: 'Loads integrations listings.',
          },
        })();
      });
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
        void fetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
          queryFn: () => fetchProductListings(productId),
          staleTime: 0,
          meta: {
            source: 'products.hooks.useProductListIntegrations.refreshListings',
            operation: 'list',
            resource: 'integrations.listings',
            domain: 'integrations',
            tags: ['integrations', 'listings', 'fetch'],
            description: 'Loads integrations listings.',
          },
        })();
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

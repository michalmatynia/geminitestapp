'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import {
  fetchProductListings,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import { prefetchQueryV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export function useProductListIntegrations() {
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void import('@/features/integrations/components/listings/SelectIntegrationModal');
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
        description: 'Loads integrations connections.'},
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
        description: 'Loads integrations default connection.'},
    })();
  }, [queryClient]);

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
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
          description: 'Loads integrations listings.'},
      })();
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
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
          description: 'Loads integrations listings.'},
      })();
    },
    [queryClient]
  );

  return {
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
  };
}

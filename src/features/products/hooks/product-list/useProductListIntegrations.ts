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
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export function useProductListIntegrations() {
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void import('@/features/integrations/components/listings/SelectIntegrationModal');
    void queryClient.prefetchQuery({
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
      queryFn: fetchIntegrationsWithConnections,
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
      queryFn: fetchPreferredBaseConnection,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void queryClient.prefetchQuery({
        queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
        queryFn: () => fetchProductListings(productId),
        staleTime: 30 * 1000,
      });
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void queryClient.fetchQuery({
        queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
        queryFn: () => fetchProductListings(productId),
        staleTime: 0,
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

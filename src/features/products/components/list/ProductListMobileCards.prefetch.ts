import type { QueryClient } from '@tanstack/react-query';

import { isMissingProductListingsError } from '@/features/integrations/product-integrations-adapter';
import { loadProductIntegrationsAdapter } from '@/features/products/lib/product-integrations-adapter-loader';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const prefetchProductListings = (
  queryClient: QueryClient,
  productId: string
): void => {
  void loadProductIntegrationsAdapter().then(
    ({ fetchProductListings, productListingsQueryKey }) => {
      const queryKey = normalizeQueryKey(productListingsQueryKey(productId));

      void prefetchQueryV2(queryClient, {
        queryKey,
        queryFn: () => fetchProductListings(productId),
        staleTime: 30 * 1000,
        logError: false,
        meta: {
          source: 'products.mobile.integrations.prefetchListings',
          operation: 'list',
          resource: 'integrations.listings',
          domain: 'integrations',
          queryKey,
          tags: ['integrations', 'listings', 'prefetch'],
          description: 'Loads integrations listings.',
        },
      })().catch((error: unknown) => {
        if (isMissingProductListingsError(error)) {
          queryClient.removeQueries({ queryKey });
          return;
        }
        logClientCatch(error, {
          source: 'products.mobile.integrations',
          action: 'prefetchListings',
          productId,
          level: 'warn',
        });
      });
    }
  );
};

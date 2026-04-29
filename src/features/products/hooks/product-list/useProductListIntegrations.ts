'use client';

// useProductListIntegrations: provides prefetch and refresh helpers for
// integrations-related data (connection selection, product listings). The
// implementation dynamically loads the integrations adapter to avoid pulling
// heavy integration code into the main product list bundle. Errors caused by a
// missing listings implementation are treated specially (they clear the
// query) while other failures are logged for observability.
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { isMissingProductListingsError } from '@/features/integrations/product-integrations-adapter';
import { loadProductIntegrationsAdapter } from '@/features/products/lib/product-integrations-adapter-loader';
import { prefetchQueryV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type ProductListIntegrationsController = {
  prefetchIntegrationSelectionData: () => void;
  prefetchProductListingsData: (productId: string) => void;
  refreshProductListingsData: (productId: string) => void;
};

type ProductIntegrationsAdapter = Awaited<ReturnType<typeof loadProductIntegrationsAdapter>>;
type ProductListingsQueryMode = 'prefetch' | 'refresh';

const prefetchIntegrationSelectionQueries = (
  queryClient: QueryClient,
  adapter: ProductIntegrationsAdapter
): void => {
  const {
    fetchIntegrationsWithConnections,
    integrationSelectionQueryKeys,
  } = adapter;
  const staleTime = 5 * 60 * 1000;

  void prefetchQueryV2(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
    queryFn: fetchIntegrationsWithConnections,
    staleTime,
    meta: {
      source: 'products.hooks.useProductListIntegrations.prefetchSelection',
      operation: 'list',
      resource: 'integrations.connections',
      domain: 'integrations',
      tags: ['integrations', 'connections', 'prefetch'],
      description: 'Loads integrations connections.',
    },
  })();
  prefetchPreferredConnectionQueries(queryClient, adapter, staleTime);
};

const prefetchPreferredConnectionQueries = (
  queryClient: QueryClient,
  adapter: ProductIntegrationsAdapter,
  staleTime: number
): void => {
  const { fetchPreferredBaseConnection, fetchPreferredTraderaConnection, fetchPreferredVintedConnection, integrationSelectionQueryKeys } = adapter;
  void prefetchQueryV2(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
    queryFn: fetchPreferredBaseConnection,
    staleTime,
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
    staleTime,
    meta: {
      source: 'products.hooks.useProductListIntegrations.prefetchTraderaDefault',
      operation: 'detail',
      resource: 'integrations.tradera-default-connection',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'default-connection', 'prefetch'],
      description: 'Loads integrations Tradera default connection.',
    },
  })();
  void prefetchQueryV2(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.vintedDefaultConnection),
    queryFn: fetchPreferredVintedConnection,
    staleTime,
    meta: {
      source: 'products.hooks.useProductListIntegrations.prefetchVintedDefault',
      operation: 'detail',
      resource: 'integrations.vinted-default-connection',
      domain: 'integrations',
      tags: ['integrations', 'vinted', 'default-connection', 'prefetch'],
      description: 'Loads integrations Vinted default connection.',
    },
  })();
};

const runProductListingsQuery = (
  queryClient: QueryClient,
  productId: string,
  mode: ProductListingsQueryMode
): void => {
  void loadProductIntegrationsAdapter().then(({ fetchProductListings, productListingsQueryKey }) => {
    const queryKey = normalizeQueryKey(productListingsQueryKey(productId));
    const queryRunner = mode === 'prefetch' ? prefetchQueryV2 : fetchQueryV2;
    void queryRunner(queryClient, {
      queryKey,
      queryFn: () => fetchProductListings(productId),
      staleTime: mode === 'prefetch' ? 30 * 1000 : 0,
      logError: false,
      meta: buildProductListingsQueryMeta(mode),
    })().catch((error: unknown) => {
      handleProductListingsQueryError({ error, mode, productId, queryClient, queryKey });
    });
  });
};

const buildProductListingsQueryMeta = (mode: ProductListingsQueryMode): {
  source: string;
  operation: 'list';
  resource: string;
  domain: string;
  tags: string[];
  description: string;
} => ({
  source: `products.hooks.useProductListIntegrations.${mode === 'prefetch' ? 'prefetchListings' : 'refreshListings'}`,
  operation: 'list',
  resource: 'integrations.listings',
  domain: 'integrations',
  tags: ['integrations', 'listings', mode === 'prefetch' ? 'prefetch' : 'fetch'],
  description: 'Loads integrations listings.',
});

const handleProductListingsQueryError = ({
  error,
  mode,
  productId,
  queryClient,
  queryKey,
}: {
  error: unknown;
  mode: ProductListingsQueryMode;
  productId: string;
  queryClient: QueryClient;
  queryKey: readonly unknown[];
}): void => {
  if (isMissingProductListingsError(error)) {
    queryClient.removeQueries({ queryKey });
    return;
  }
  logClientCatch(error, {
    source: 'products.hooks.useProductListIntegrations',
    action: mode === 'prefetch' ? 'prefetchProductListingsData' : 'refreshProductListingsData',
    productId,
    level: 'warn',
  });
};

export function useProductListIntegrations(): ProductListIntegrationsController {
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void loadProductIntegrationsAdapter().then((adapter) => {
      prefetchIntegrationSelectionQueries(queryClient, adapter);
    });
  }, [queryClient]);

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (productId === '') return;
      runProductListingsQuery(queryClient, productId, 'prefetch');
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (productId === '') return;
      runProductListingsQuery(queryClient, productId, 'refresh');
    },
    [queryClient]
  );

  return {
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
  };
}

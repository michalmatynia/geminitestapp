import { type Query } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { ApiError, api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { integrationKeys } from '@/shared/lib/query-key-exports';

const PRODUCT_LISTINGS_STALE_TIME_MS = 30_000;

export const productListingsQueryKey = (productId: string): readonly unknown[] =>
  integrationKeys.listings(productId);

export const fetchProductListings = (productId: string): Promise<ProductListingWithDetails[]> =>
  api.get<ProductListingWithDetails[]>(`/api/v2/integrations/products/${productId}/listings`);

export const isMissingProductListingsError = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status === 404 &&
  error.message.trim().toLowerCase() === 'product not found';

export function useProductListings(productId: string): ListQuery<ProductListingWithDetails> {
  const queryKey = productListingsQueryKey(productId);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchProductListings(productId),
    enabled: Boolean(productId),
    staleTime: PRODUCT_LISTINGS_STALE_TIME_MS,
    refetchInterval: (
      query: Query<
        ProductListingWithDetails[],
        Error,
        ProductListingWithDetails[],
        readonly unknown[]
      >
    ) => {
      const data = query.state.data;
      if (!Array.isArray(data)) return false;
      const activeStatuses = new Set([
        'queued',
        'queued_relist',
        'pending',
        'running',
        'processing',
        'in_progress',
      ]);
      const hasInFlight = data.some((listing: ProductListingWithDetails) =>
        activeStatuses.has((listing.status ?? '').trim().toLowerCase())
      );
      return hasInFlight ? 2500 : false;
    },
    meta: {
      source: 'integrations.hooks.useProductListings',
      operation: 'list',
      resource: 'integrations.product-listings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'listings'],
      description: 'Loads integrations product listings.'},
  });
}

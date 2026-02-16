'use client';

import { type Query } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
} from '@/shared/lib/query-factories-v2';
import { integrationKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery } from '@/shared/types/query-result-types';

const PRODUCT_LISTINGS_STALE_TIME_MS = 30_000;

export const productListingsQueryKey = (productId: string): readonly unknown[] =>
  integrationKeys.listings(productId);

export const fetchProductListings = (productId: string): Promise<ProductListingWithDetails[]> =>
  api.get<ProductListingWithDetails[]>(`/api/integrations/products/${productId}/listings`);

export function useProductListings(productId: string): ListQuery<ProductListingWithDetails> {
  const queryKey = productListingsQueryKey(productId);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchProductListings(productId),
    enabled: Boolean(productId),
    staleTime: PRODUCT_LISTINGS_STALE_TIME_MS,
    refetchInterval: (
      query: Query<ProductListingWithDetails[], Error, ProductListingWithDetails[], readonly unknown[]>
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
    },
  });
}

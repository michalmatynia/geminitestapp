'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import { integrationKeys } from '@/shared/lib/query-key-exports';

const PRODUCT_LISTINGS_STALE_TIME_MS = 30_000;
const PRODUCT_LISTINGS_GC_TIME_MS = 5 * 60 * 1000;

export const productListingsQueryKey = (productId: string): readonly unknown[] =>
  integrationKeys.listings(productId);

export const fetchProductListings = (productId: string): Promise<ProductListingWithDetails[]> =>
  api.get<ProductListingWithDetails[]>(`/api/integrations/products/${productId}/listings`);

export function useProductListings(productId: string): UseQueryResult<ProductListingWithDetails[], Error> {
  return useQuery({
    queryKey: productListingsQueryKey(productId),
    queryFn: () => fetchProductListings(productId),
    enabled: Boolean(productId),
    staleTime: PRODUCT_LISTINGS_STALE_TIME_MS,
    gcTime: PRODUCT_LISTINGS_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
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
      const hasInFlight = data.some((listing) =>
        activeStatuses.has((listing.status ?? '').trim().toLowerCase())
      );
      return hasInFlight ? 2500 : false;
    },
    refetchIntervalInBackground: true,
  });
}

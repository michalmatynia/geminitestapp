'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const listingKeys = QUERY_KEYS.integrations;
const PRODUCT_LISTINGS_STALE_TIME_MS = 30_000;
const PRODUCT_LISTINGS_GC_TIME_MS = 5 * 60 * 1000;

export const productListingsQueryKey = (productId: string): readonly unknown[] =>
  listingKeys.listings(productId);

export const fetchProductListings = (productId: string): Promise<ProductListingWithDetails[]> =>
  api.get<ProductListingWithDetails[]>(`/api/integrations/products/${productId}/listings`);

export function useProductListings(productId: string): UseQueryResult<ProductListingWithDetails[], Error> {
  return useQuery<ProductListingWithDetails[], Error>({
    queryKey: productListingsQueryKey(productId),
    queryFn: () => fetchProductListings(productId),
    enabled: Boolean(productId),
    staleTime: PRODUCT_LISTINGS_STALE_TIME_MS,
    gcTime: PRODUCT_LISTINGS_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

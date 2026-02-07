'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const listingKeys = QUERY_KEYS.integrations;

export function useProductListings(productId: string): UseQueryResult<ProductListingWithDetails[], Error> {
  return useQuery<ProductListingWithDetails[], Error>({
    queryKey: listingKeys.listings(productId),
    queryFn: () => api.get<ProductListingWithDetails[]>(`/api/integrations/products/${productId}/listings`),
    enabled: Boolean(productId),
  });
}
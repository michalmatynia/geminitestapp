'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';

export const listingKeys = {
  all: ['integrations', 'listings'] as const,
  product: (productId: string) => ['integrations', 'product-listings', productId] as const,
};

export function useProductListings(productId: string): UseQueryResult<ProductListingWithDetails[], Error> {
  return useQuery<ProductListingWithDetails[], Error>({
    queryKey: listingKeys.product(productId),
    queryFn: async (): Promise<ProductListingWithDetails[]> => {
      const res: Response = await fetch(`/api/integrations/products/${productId}/listings`);
      if (!res.ok) {
        throw new Error('Failed to fetch listings');
      }
      return (await res.json()) as ProductListingWithDetails[];
    },
    enabled: Boolean(productId),
  });
}

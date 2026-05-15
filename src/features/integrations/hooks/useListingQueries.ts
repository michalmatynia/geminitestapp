import { type Query } from '@tanstack/react-query';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { ApiError, api } from '@/shared/lib/api-client';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { integrationKeys } from '@/shared/lib/query-key-exports';

const PRODUCT_LISTINGS_STALE_TIME_MS = 30_000;

export type ProductListingsRequestOptions = {
  enabled?: boolean;
  traderaConnectionId?: string | null | undefined;
};

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildProductListingsUrl = (
  productId: string,
  options?: ProductListingsRequestOptions
): string => {
  const baseUrl = `/api/v2/integrations/products/${productId}/listings`;
  const traderaConnectionId = normalizeOptionalId(options?.traderaConnectionId);
  if (traderaConnectionId === null) return baseUrl;
  return `${baseUrl}?traderaConnectionId=${encodeURIComponent(traderaConnectionId)}`;
};

export const productListingsQueryKey = (
  productId: string,
  options?: ProductListingsRequestOptions
): readonly unknown[] => {
  const traderaConnectionId = normalizeOptionalId(options?.traderaConnectionId);
  if (traderaConnectionId === null) return integrationKeys.listings(productId);
  return [...integrationKeys.listings(productId), { traderaConnectionId }] as const;
};

export const fetchProductListings = (
  productId: string,
  options?: ProductListingsRequestOptions
): Promise<ProductListingWithDetails[]> =>
  api.get<ProductListingWithDetails[]>(
    buildProductListingsUrl(productId, options),
    { cache: 'no-store' }
  );

export const isMissingProductListingsError = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status === 404 &&
  error.message.trim().toLowerCase() === 'product not found';

export function useProductListings(
  productId: string,
  options?: ProductListingsRequestOptions
): ListQuery<ProductListingWithDetails> {
  const queryKey = productListingsQueryKey(productId, options);
  return useListQueryV2({
    queryKey,
    queryFn: () => fetchProductListings(productId, options),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    staleTime: PRODUCT_LISTINGS_STALE_TIME_MS,
    refetchOnMount: 'always',
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
        activeStatuses.has(listing.status.trim().toLowerCase())
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

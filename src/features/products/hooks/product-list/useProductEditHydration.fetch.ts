import type { QueryClient, QueryKey } from '@tanstack/react-query';

import {
  getProductDetailEditQueryKey,
  getProductDetailQueryKey,
} from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export const PRODUCT_DETAIL_TIMEOUT_MS = 60_000;
export const PRODUCT_DETAIL_CACHE_FRESH_MS = 10_000;

export type ProductDetailQueryKeys = {
  detailQueryKey: QueryKey;
  detailEditQueryKey: QueryKey;
};

export const buildProductDetailQueryKeys = (productId: string): ProductDetailQueryKeys => ({
  detailQueryKey: normalizeQueryKey(getProductDetailQueryKey(productId)),
  detailEditQueryKey: normalizeQueryKey(getProductDetailEditQueryKey(productId)),
});

const readFreshQueryData = (
  queryClient: QueryClient,
  queryKey: QueryKey
): ProductWithImages | undefined => {
  const existingState = queryClient.getQueryState<ProductWithImages>(queryKey);
  if (typeof existingState?.dataUpdatedAt !== 'number') return undefined;
  if (Date.now() - existingState.dataUpdatedAt >= PRODUCT_DETAIL_CACHE_FRESH_MS) {
    return undefined;
  }
  return queryClient.getQueryData<ProductWithImages>(queryKey);
};

export const readFreshCachedEditProductDetail = (
  queryClient: QueryClient,
  productId: string
): { keys: ProductDetailQueryKeys; cachedData: ProductWithImages | undefined } => {
  const keys = buildProductDetailQueryKeys(productId);
  const detailEditCachedData = readFreshQueryData(queryClient, keys.detailEditQueryKey);
  const detailCachedData = readFreshQueryData(queryClient, keys.detailQueryKey);
  return {
    keys,
    cachedData: detailEditCachedData ?? detailCachedData,
  };
};

export const fetchFreshEditProductDetail = (input: {
  queryClient: QueryClient;
  productId: string;
  queryKey: QueryKey;
  source: string;
  tags: string[];
}): Promise<ProductWithImages> =>
  fetchQueryV2(input.queryClient, {
    queryKey: input.queryKey,
    queryFn: ({ signal }) =>
      api.get<ProductWithImages>(
        `/api/v2/products/${encodeURIComponent(input.productId)}?fresh=1`,
        {
          signal,
          cache: 'no-store',
          logError: false,
          timeout: PRODUCT_DETAIL_TIMEOUT_MS,
        }
      ),
    staleTime: 0,
    logError: false,
    meta: {
      source: input.source,
      operation: 'detail',
      resource: 'products.detailEdit',
      domain: 'products',
      queryKey: input.queryKey,
      tags: input.tags,
      description: 'Loads products edit detail.',
    },
  })();

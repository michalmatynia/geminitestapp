import { type QueryClient } from '@tanstack/react-query';

import {
  addQueuedProductSource,
  buildQueuedProductOfflineMutationSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { TanstackFactoryMeta } from '@/shared/lib/tanstack-factory-v2.types';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  getProductDetailQueryKey,
  invalidateProductsAndCounts,
  invalidateProductTitleTerms,
} from './productCache';
import { refreshUpdatedProductCaches } from './useProductDataMutations.cache';
import type {
  ProductUpdateVariables,
  QueryClientMutationContext,
} from './useProductDataMutations.types';

const PRODUCT_UPDATE_QUEUE_SOURCE = buildQueuedProductOfflineMutationSource('update');

export const PRODUCT_UPDATE_MUTATION_META = {
  source: 'products.hooks.useUpdateProductMutation',
  operation: 'update',
  resource: 'products',
  domain: 'products',
  tags: ['products', 'update'],
} satisfies Partial<TanstackFactoryMeta>;

export const getProductUpdateExtraInvalidateKeys = (
  variables: ProductUpdateVariables
): readonly (readonly unknown[])[] => [
  QUERY_KEYS.products.counts(),
  QUERY_KEYS.products.detail(variables.id),
];

export const handleProductUpdateInvalidate = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages | null
): void => {
  void invalidateProductTitleTerms(queryClient);
  if (savedProduct === null) return;
  refreshUpdatedProductCaches(queryClient, savedProduct);
};

export const markProductUpdateQueued = (variables: ProductUpdateVariables): void => {
  addQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE);
};

export const handleProductUpdateProcessed = (
  variables: ProductUpdateVariables,
  { queryClient }: QueryClientMutationContext
): void => {
  removeQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE);
  void invalidateProductsAndCounts(queryClient);
  void invalidateProductTitleTerms(queryClient);
  void queryClient.invalidateQueries({ queryKey: getProductDetailQueryKey(variables.id) });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detailEdit(variables.id) });
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
  });
};

export const markProductUpdateFailed = (variables: ProductUpdateVariables): void => {
  removeQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE);
};

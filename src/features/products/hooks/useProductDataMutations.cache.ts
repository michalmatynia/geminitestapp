import type { QueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getProductDetailQueryKey } from './productCache';

type PaginatedItemsCacheValue = {
  items: ProductWithImages[];
  total?: number;
};

type ProductsArrayCacheValue = {
  products: ProductWithImages[];
};

type ProductListCacheValue =
  | ProductWithImages[]
  | PaginatedItemsCacheValue
  | ProductsArrayCacheValue
  | null
  | undefined;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isPaginatedItemsCacheValue = (cacheValue: unknown): cacheValue is PaginatedItemsCacheValue =>
  isObjectRecord(cacheValue) && Array.isArray(cacheValue['items']);

const isProductsArrayCacheValue = (cacheValue: unknown): cacheValue is ProductsArrayCacheValue =>
  isObjectRecord(cacheValue) && Array.isArray(cacheValue['products']);

const mergeSavedProduct = (
  product: ProductWithImages,
  savedProduct: ProductWithImages
): ProductWithImages =>
  product.id === savedProduct.id ? { ...product, ...savedProduct } : product;

const patchProductListCacheValue = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) => mergeSavedProduct(product, savedProduct));
  }
  if (isPaginatedItemsCacheValue(cacheValue)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        mergeSavedProduct(product, savedProduct)
      ),
    };
  }
  if (isProductsArrayCacheValue(cacheValue)) {
    return {
      ...cacheValue,
      products: cacheValue.products.map((product: ProductWithImages) =>
        mergeSavedProduct(product, savedProduct)
      ),
    };
  }
  return cacheValue;
};

export const syncUpdatedProductAcrossCaches = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages
): void => {
  queryClient.setQueryData(
    getProductDetailQueryKey(savedProduct.id),
    (old: ProductWithImages | undefined): ProductWithImages =>
      old !== undefined ? { ...old, ...savedProduct } : savedProduct
  );
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), savedProduct);
  queryClient.setQueriesData(
    { queryKey: QUERY_KEYS.products.lists() },
    (old: ProductListCacheValue) => patchProductListCacheValue(old, savedProduct)
  );
};

export const refreshUpdatedProductCaches = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages
): void => {
  syncUpdatedProductAcrossCaches(queryClient, savedProduct);
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists(), refetchType: 'none' }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts(), refetchType: 'none' }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.detail(savedProduct.id),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.detailEdit(savedProduct.id),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
      refetchType: 'none',
    }),
  ])
    .catch((error: unknown) => {
      logClientError(error, {
        context: {
          source: 'products.hooks.useUpdateProductMutation',
          action: 'refreshUpdatedProductCaches',
          productId: savedProduct.id,
        },
      });
    })
    .finally(() => {
      syncUpdatedProductAcrossCaches(queryClient, savedProduct);
    });
};

'use client';

import { type QueryClient, type UseMutationResult } from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api';
import {
  addQueuedProductSource,
  buildQueuedProductOfflineMutationSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { IdDataDto } from '@/shared/contracts/base';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  productsAllQueryKey,
  productsCountsQueryKey,
  getProductDetailQueryKey,
  invalidateProductsAndCounts,
  invalidateProductTitleTerms,
} from './productCache';

const PRODUCT_UPDATE_FORM_TIMEOUT_MS = 60_000;
const PRODUCT_UPDATE_QUEUE_SOURCE = buildQueuedProductOfflineMutationSource('update');
const PRODUCT_DELETE_QUEUE_SOURCE = buildQueuedProductOfflineMutationSource('delete');

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[]; total?: number }
  | { products: ProductWithImages[] }
  | null
  | undefined;

const isPaginatedItemsCacheValue = (
  cacheValue: ProductListCacheValue
): cacheValue is { items: ProductWithImages[]; total?: number } =>
  !!cacheValue && !Array.isArray(cacheValue) && 'items' in cacheValue && Array.isArray(cacheValue.items);

const isProductsArrayCacheValue = (
  cacheValue: ProductListCacheValue
): cacheValue is { products: ProductWithImages[] } =>
  !!cacheValue &&
  !Array.isArray(cacheValue) &&
  'products' in cacheValue &&
  Array.isArray(cacheValue.products);

const patchProductListCacheValue = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === savedProduct.id ? { ...product, ...savedProduct } : product
    );
  }
  if (isPaginatedItemsCacheValue(cacheValue)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  if (isProductsArrayCacheValue(cacheValue)) {
    return {
      ...cacheValue,
      products: cacheValue.products.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  return cacheValue;
};

const syncUpdatedProductAcrossCaches = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages
): void => {
  queryClient.setQueryData(
    getProductDetailQueryKey(savedProduct.id),
    (old: ProductWithImages | undefined) => (old ? { ...old, ...savedProduct } : savedProduct)
  );
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), savedProduct);
  queryClient.setQueriesData(
    { queryKey: QUERY_KEYS.products.lists() },
    (old: ProductListCacheValue) => patchProductListCacheValue(old, savedProduct)
  );
};

const refreshUpdatedProductCaches = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages
): void => {
  syncUpdatedProductAcrossCaches(queryClient, savedProduct);
  void Promise.all([
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.lists(),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.counts(),
      refetchType: 'none',
    }),
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
    .catch((error) => {
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

export function useCreateProductMutation(): UseMutationResult<unknown, Error, FormData, unknown> {
  return useOfflineMutation((formData: FormData) => createProduct(formData), {
    queryKey: productsAllQueryKey,
    meta: {
      source: 'products.hooks.useCreateProductMutation',
      operation: 'create',
      resource: 'products',
      domain: 'products',
      tags: ['products', 'create'],
    },
    extraInvalidateKeys: [productsCountsQueryKey],
    invalidate: async (queryClient) => {
      await Promise.all([
        invalidateProductsAndCounts(queryClient),
        invalidateProductTitleTerms(queryClient),
      ]);
    },
    queuedMessage: 'Product creation queued in runtime queue.',
    processedMessage: 'Queued product creation completed.',
    errorMessage: 'Failed to create product',
  });
}

export function useUpdateProductMutation(): UseMutationResult<
  ProductWithImages | null,
  Error,
  IdDataDto<Partial<ProductWithImages> | FormData> & {
    originalSku?: string | null;
    originalNameEn?: string | null;
  },
  unknown
> {
  const normalizeIdentityText = (value?: string | null): string =>
    typeof value === 'string' ? value.trim() : '';

  const collectFieldErrorMessages = (details: unknown): string[] => {
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
      return [];
    }

    const fields = (details as { fields?: unknown }).fields;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return [];
    }

    return Object.entries(fields as Record<string, unknown>)
      .flatMap(([field, value]): string[] => {
        if (!Array.isArray(value)) {
          return [];
        }

        return value
          .map((entry: unknown): string => {
            const message = typeof entry === 'string' ? entry.trim() : '';
            return message ? `${field}: ${message}` : '';
          })
          .filter((entry: string): boolean => entry.length > 0);
      })
      .slice(0, 3);
  };

  const parseUpdateError = async (response: Response): Promise<string> => {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: unknown;
    };
    let message = errorData.error || 'Failed to update product';
    const detailMessages = Array.isArray(errorData.details)
      ? errorData.details
        .slice(0, 3)
        .map((d: { field?: unknown; message?: unknown }) => {
          const field = typeof d.field === 'string' && d.field ? d.field : 'field';
          const msg = typeof d.message === 'string' && d.message ? d.message : 'invalid';
          return `${field}: ${msg}`;
        })
      : collectFieldErrorMessages(errorData.details);
    if (detailMessages.length > 0) {
      message = `${message} (${detailMessages.join(', ')})`;
    }
    return message;
  };

  const resolveProductIdByIdentity = async (
    originalSku?: string | null,
    originalNameEn?: string | null
  ): Promise<
    | { kind: 'resolved'; id: string }
    | { kind: 'ambiguous'; matchCount: number }
    | { kind: 'missing' }
  > => {
    const normalizedSku = normalizeIdentityText(originalSku).toUpperCase();
    if (!normalizedSku) return { kind: 'missing' };
    const normalizedNameEn = normalizeIdentityText(originalNameEn);

    const products = await api
      .get<ProductWithImages[]>(`/api/v2/products?sku=${encodeURIComponent(normalizedSku)}`, {
        cache: 'no-store',
        logError: false,
      })
      .catch(() => null);

    if (!products) return { kind: 'missing' };

    const exactMatches = products.filter(
      (product: ProductWithImages): boolean =>
        typeof product.sku === 'string' && product.sku.trim().toUpperCase() === normalizedSku
    );

    if (exactMatches.length === 1) {
      return { kind: 'resolved', id: exactMatches[0]!.id };
    }

    if (exactMatches.length > 1 && normalizedNameEn) {
      const exactNameMatches = exactMatches.filter(
        (product: ProductWithImages): boolean =>
          typeof product.name_en === 'string' && product.name_en.trim() === normalizedNameEn
      );
      if (exactNameMatches.length === 1) {
        return { kind: 'resolved', id: exactNameMatches[0]!.id };
      }
    }

    if (exactMatches.length > 1) {
      return { kind: 'ambiguous', matchCount: exactMatches.length };
    }

    return { kind: 'missing' };
  };

  return useOfflineMutation(
    async ({
      id,
      data,
      originalSku,
      originalNameEn,
    }: IdDataDto<Partial<ProductWithImages> | FormData> & {
      originalSku?: string | null;
      originalNameEn?: string | null;
    }): Promise<ProductWithImages> => {
      if (data instanceof FormData) {
        const putProductFormData = async (
          targetId: string,
          formData: FormData
        ): Promise<Response> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), PRODUCT_UPDATE_FORM_TIMEOUT_MS);
          try {
            return await fetch(`/api/v2/products/${targetId}`, {
              method: 'PUT',
              body: formData,
              headers: withCsrfHeaders(),
              credentials: 'same-origin',
              signal: controller.signal,
            });
          } catch (error) {
            logClientError(error);
            if (controller.signal.aborted) {
              throw new Error(`Request timeout after ${PRODUCT_UPDATE_FORM_TIMEOUT_MS}ms`, {
                cause: error,
              });
            }
            throw error;
          } finally {
            clearTimeout(timeoutId);
          }
        };

        let targetId = id;
        let response = await putProductFormData(targetId, data);

        if (response.status === 404) {
          const resolution = await resolveProductIdByIdentity(originalSku, originalNameEn);
          if (resolution.kind === 'resolved' && resolution.id !== targetId) {
            targetId = resolution.id;
            response = await putProductFormData(targetId, data);
          } else if (resolution.kind === 'ambiguous') {
            throw notFoundError(
              `Product not found. The opened product id is stale, and SKU ${normalizeIdentityText(originalSku) || 'this product'} matches ${resolution.matchCount} products. Refresh the products list and reopen the correct product.`
            );
          }
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw notFoundError(
              'Product not found. It may have been moved or deleted. Refresh the product list and try again.'
            );
          }
          throw badRequestError(await parseUpdateError(response));
        }
        return response.json() as Promise<ProductWithImages>;
      }
      return updateProduct(id, data);
    },
    {
      queryKey: QUERY_KEYS.products.lists(),
      skipBaseInvalidation: true,
      extraInvalidateKeys: (variables) => [
        QUERY_KEYS.products.counts(),
        QUERY_KEYS.products.detail(variables.id),
      ],
      meta: {
        source: 'products.hooks.useUpdateProductMutation',
        operation: 'update',
        resource: 'products',
        domain: 'products',
        tags: ['products', 'update'],
      },
      invalidate: (queryClient, savedProduct) => {
        void invalidateProductTitleTerms(queryClient);
        if (!savedProduct) return;
        refreshUpdatedProductCaches(queryClient, savedProduct);
      },
      queuedMessage: 'Product update queued in runtime queue.',
      processedMessage: 'Queued product update completed.',
      onQueued: (variables: {
        id: string;
        data: Partial<ProductWithImages> | FormData;
        originalSku?: string | null;
        originalNameEn?: string | null;
      }) => addQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE),
      onProcessed: (
        variables: {
          id: string;
          data: Partial<ProductWithImages> | FormData;
          originalSku?: string | null;
          originalNameEn?: string | null;
        },
        { queryClient }
      ) => {
        removeQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE);
        void invalidateProductsAndCounts(queryClient);
        void invalidateProductTitleTerms(queryClient);
        void queryClient.invalidateQueries({
          queryKey: getProductDetailQueryKey(variables.id),
        });
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.detailEdit(variables.id),
        });
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
        });
      },
      onFailed: (variables: {
        id: string;
        data: Partial<ProductWithImages> | FormData;
        originalSku?: string | null;
        originalNameEn?: string | null;
      }) => removeQueuedProductSource(variables.id, PRODUCT_UPDATE_QUEUE_SOURCE),
    }
  );
}

export function useBulkDeleteProductsMutation(): UseMutationResult<
  { success: boolean } | null,
  Error,
  string[],
  unknown
> {
  return useOfflineMutation(
    async (ids: string[]): Promise<{ success: boolean }> => {
      const responses = await Promise.all(ids.map((id: string) => deleteProduct(id)));
      if (responses.some((r: { success: boolean }) => !r.success)) {
        throw operationFailedError('Failed to delete some products');
      }
      return { success: true };
    },
    {
      queryKey: productsAllQueryKey,
      meta: {
        source: 'products.hooks.useBulkDeleteProductsMutation',
        operation: 'delete',
        resource: 'products.bulk',
        domain: 'products',
        tags: ['products', 'bulk-delete'],
      },
      extraInvalidateKeys: [productsCountsQueryKey],
      queuedMessage: 'Product deletion queued in runtime queue.',
      processedMessage: 'Queued product deletion completed.',
      errorMessage: 'Failed to delete some products',
      onQueued: (ids: string[]) =>
        ids.forEach((id: string) => addQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE)),
      onProcessed: (ids: string[]) =>
        ids.forEach((id: string) => removeQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE)),
      onFailed: (ids: string[]) =>
        ids.forEach((id: string) => removeQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE)),
    }
  );
}

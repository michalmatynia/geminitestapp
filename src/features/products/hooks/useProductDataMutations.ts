'use client';

// useProductDataMutations: collection of server-facing mutations for product
// data (create, update, delete, bulk operations). Each mutation uses the
// project's query-factory helpers to enable optimistic updates and cache
// invalidation strategies.

import { type UseMutationResult } from '@tanstack/react-query';

import { createProduct, deleteProduct } from '@/features/products/api';
import {
  addQueuedProductSource,
  buildQueuedProductOfflineMutationSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { operationFailedError } from '@/shared/errors/app-error';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  productsAllQueryKey,
  productsCountsQueryKey,
  invalidateProductsAndCounts,
  invalidateProductTitleTerms,
} from './productCache';
import { updateProductByPayload } from './useProductDataMutations.form-data';
import type { ProductUpdateVariables } from './useProductDataMutations.types';
import {
  getProductUpdateExtraInvalidateKeys,
  handleProductUpdateInvalidate,
  handleProductUpdateProcessed,
  markProductUpdateFailed,
  markProductUpdateQueued,
  PRODUCT_UPDATE_MUTATION_META,
} from './useProductDataMutations.update-options';

const PRODUCT_DELETE_QUEUE_SOURCE = buildQueuedProductOfflineMutationSource('delete');

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
  });
}

export function useUpdateProductMutation(): UseMutationResult<
  ProductWithImages | null,
  Error,
  ProductUpdateVariables,
  unknown
> {
  return useOfflineMutation<ProductWithImages | null, Error, ProductUpdateVariables, unknown>(
    updateProductByPayload,
    {
      queryKey: QUERY_KEYS.products.lists(),
      skipBaseInvalidation: true,
      extraInvalidateKeys: getProductUpdateExtraInvalidateKeys,
      meta: PRODUCT_UPDATE_MUTATION_META,
      invalidate: handleProductUpdateInvalidate,
      queuedMessage: 'Product update queued in runtime queue.',
      processedMessage: 'Queued product update completed.',
      onQueued: markProductUpdateQueued,
      onProcessed: handleProductUpdateProcessed,
      onFailed: markProductUpdateFailed,
    }
  );
}

export function useDuplicateProductMutation(): UseMutationResult<
  ProductWithImages | null,
  Error,
  { id: string; sku: string },
  unknown
> {
  return useOfflineMutation(
    ({ id, sku }: { id: string; sku: string }): Promise<ProductWithImages> =>
      api.post<ProductWithImages>(`/api/v2/products/${id}/duplicate`, { sku }),
    {
      queryKey: productsAllQueryKey,
      meta: {
        source: 'products.hooks.useDuplicateProductMutation',
        operation: 'create',
        resource: 'products.duplicate',
        domain: 'products',
        tags: ['products', 'duplicate'],
      },
      extraInvalidateKeys: [productsCountsQueryKey],
      invalidate: async (queryClient) => {
        await Promise.all([
          invalidateProductsAndCounts(queryClient),
          invalidateProductTitleTerms(queryClient),
        ]);
      },
      queuedMessage: 'Product duplication queued in runtime queue.',
      processedMessage: 'Queued product duplication completed.',
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
      if (responses.some((response: { success: boolean }) => !response.success)) {
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
      onQueued: (ids: string[]) => {
        ids.forEach((id: string) => addQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE));
      },
      onProcessed: (ids: string[], { queryClient }) => {
        ids.forEach((id: string) => removeQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE));
        void Promise.all([
          invalidateProductsAndCounts(queryClient),
          invalidateProductTitleTerms(queryClient),
        ]);
      },
      onFailed: (ids: string[]) => {
        ids.forEach((id: string) => removeQueuedProductSource(id, PRODUCT_DELETE_QUEUE_SOURCE));
      },
    }
  );
}

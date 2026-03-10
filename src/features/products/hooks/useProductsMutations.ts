'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui';
import { AppError, operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { delay } from '@/shared/utils';

import {
  invalidateProductsAndCounts,
  invalidateProductsAndDetail,
  getProductDetailQueryKey,
} from './productCache';

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

const patchProductListCacheValue = (
  cacheValue: ProductListCacheValue,
  productId: string,
  field: keyof ProductWithImages,
  value: ProductWithImages[keyof ProductWithImages]
): ProductListCacheValue => {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    };
  }
  return cacheValue;
};

// Retry only transient/network errors — not validation (400) or not-found (404)
const isTransientError = (error: Error): boolean => {
  if (error instanceof AppError) return error.retryable;
  const msg = error?.message?.toLowerCase() ?? '';
  return /timeout|network|connection|refused|reset|fetch/i.test(msg);
};

export function useCreateProduct(): CreateMutation<ProductWithImages, FormData> {
  return createCreateMutationV2({
    mutationFn: (formData: FormData) => createProduct(formData),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useCreateProduct',
      operation: 'create',
      resource: 'products',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'create'],
      description: 'Creates a product.',
    },
    invalidate: async (queryClient) => {
      // Small delay to ensure DB consistency before refetch
      await delay(500);
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProduct(): UpdateMutation<ProductWithImages, UpdateProductPayload> {
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: UpdateProductPayload) => updateProduct(id, data),
    mutationKey: QUERY_KEYS.products.all,
    retry: (failureCount, error) => failureCount < 2 && isTransientError(error),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    meta: {
      source: 'products.hooks.useUpdateProduct',
      operation: 'update',
      resource: 'products',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'update'],
      description: 'Updates a product.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useDeleteProduct(): DeleteMutation<{ success: boolean }, string> {
  return createDeleteMutationV2({
    mutationFn: (id: string) => deleteProduct(id),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useDeleteProduct',
      operation: 'delete',
      resource: 'products',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'delete'],
      description: 'Deletes a product.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useBulkDeleteProducts(): DeleteMutation<void, string[]> {
  return createDeleteMutationV2({
    mutationFn: async (ids: string[]): Promise<void> => {
      const responses = await Promise.all(ids.map((id: string) => deleteProduct(id)));
      if (responses.some((response: { success: boolean }) => !response.success)) {
        throw operationFailedError('Failed to delete some products');
      }
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useBulkDeleteProducts',
      operation: 'delete',
      resource: 'products.bulk',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'bulk-delete'],
      description: 'Deletes products in bulk.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useBulkConvertImagesToBase64(): UpdateMutation<{ ok: boolean }, string[]> {
  return createUpdateMutationV2({
    mutationFn: async (productIds: string[]): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/v2/products/images/base64', { productIds });
      return { ok: true };
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useBulkConvertImagesToBase64',
      operation: 'update',
      resource: 'products.images.base64.bulk',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'images', 'base64', 'bulk'],
      description: 'Converts product images to base64 in bulk.',
    },
    invalidateKeys: [QUERY_KEYS.products.lists()],
  });
}

export function useDuplicateProduct(): CreateMutation<{ id: string }, { id: string; sku: string }> {
  return createCreateMutationV2({
    mutationFn: async ({ id, sku }): Promise<{ id: string }> =>
      await api.post<{ id: string }>(`/api/v2/products/${id}/duplicate`, { sku }),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useDuplicateProduct',
      operation: 'create',
      resource: 'products.duplicate',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'duplicate'],
      description: 'Duplicates a product.',
    },
    invalidate: async (queryClient) => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProductField(): UpdateMutation<
  void,
  {
    id: string;
    field: keyof ProductWithImages;
    value: ProductWithImages[keyof ProductWithImages];
  }
  > {
  const queryClient = useQueryClient();

  return createUpdateMutationV2<
    void,
    {
      id: string;
      field: keyof ProductWithImages;
      value: ProductWithImages[keyof ProductWithImages];
    },
    { previousLists: unknown; previousDetail: unknown }
  >({
    mutationFn: async ({ id, field, value }): Promise<void> => {
      await api.patch<unknown>(`/api/v2/products/${id}`, { [field]: value });
    },
    onMutate: async ({ id, field, value }) => {
      // Optimistically update the list and detail caches
      const listKey = QUERY_KEYS.products.lists();
      const detailKey = getProductDetailQueryKey(id);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);

      // Snapshot the previous values
      const previousLists = queryClient.getQueryData<unknown>(listKey);
      const previousDetail = queryClient.getQueryData<ProductWithImages>(detailKey);

      // Optimistically update lists
      queryClient.setQueriesData({ queryKey: listKey }, (old: ProductListCacheValue) =>
        patchProductListCacheValue(old, id, field, value)
      );

      // Optimistically update detail
      queryClient.setQueryData(detailKey, (old: ProductWithImages | undefined) =>
        old ? { ...old, [field]: value } : old
      );

      return { previousLists, previousDetail };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: QUERY_KEYS.products.lists() },
          context.previousLists
        );
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(getProductDetailQueryKey(id), context.previousDetail);
      }
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useUpdateProductField',
      operation: 'update',
      resource: 'products.field',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'field-update'],
      description: 'Updates a single product field with optimistic cache sync.',
    },
    invalidate: async (queryClient, _, variables) => {
      await invalidateProductsAndDetail(queryClient, variables.id);
    },
  });
}

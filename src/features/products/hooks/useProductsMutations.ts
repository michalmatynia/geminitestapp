import { useQueryClient } from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type {
  ProductBulkImagesBase64Response,
  ProductPatchInput,
  ProductWithImages,
} from '@/shared/contracts/products';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui';
import { AppError, operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { delay } from '@/shared/utils/time-utils';

import {
  invalidateProductsAndCounts,
  getProductDetailQueryKey,
} from './productCache';

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

type ProductQuickField = keyof ProductPatchInput;

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

const mergeUpdatedProductIntoListCacheValue = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === savedProduct.id ? { ...product, ...savedProduct } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  return cacheValue;
};

const syncUpdatedProductAcrossCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  savedProduct: ProductWithImages
): void => {
  queryClient.setQueriesData({ queryKey: QUERY_KEYS.products.lists() }, (old: ProductListCacheValue) =>
    mergeUpdatedProductIntoListCacheValue(old, savedProduct)
  );
  queryClient.setQueryData(getProductDetailQueryKey(savedProduct.id), savedProduct);
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), savedProduct);
};

const markUpdatedProductCachesStale = async (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.lists(),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: getProductDetailQueryKey(productId),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.detailEdit(productId),
      refetchType: 'none',
    }),
  ]);
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

export function useBulkConvertImagesToBase64(): UpdateMutation<
  ProductBulkImagesBase64Response,
  string[]
> {
  return createUpdateMutationV2({
    mutationFn: async (productIds: string[]): Promise<ProductBulkImagesBase64Response> =>
      await api.post<ProductBulkImagesBase64Response>('/api/v2/products/images/base64', {
        productIds,
      }),
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

export function useDuplicateProduct(): CreateMutation<ProductWithImages, { id: string; sku: string }> {
  return createCreateMutationV2({
    mutationFn: async ({ id, sku }): Promise<ProductWithImages> =>
      await api.post<ProductWithImages>(`/api/v2/products/${id}/duplicate`, { sku }),
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
  ProductWithImages,
  {
    id: string;
    field: ProductQuickField;
    value: number;
  }
  > {
  const queryClient = useQueryClient();

  return createUpdateMutationV2<
    ProductWithImages,
    {
      id: string;
      field: ProductQuickField;
      value: number;
    },
    {
      previousLists: Array<[readonly unknown[], ProductListCacheValue]>;
      previousDetail: ProductWithImages | undefined;
      previousDetailEdit: ProductWithImages | undefined;
    }
  >({
    mutationFn: async ({ id, field, value }): Promise<ProductWithImages> =>
      await api.patch<ProductWithImages>(`/api/v2/products/${id}`, { [field]: value }),
    onMutate: async ({ id, field, value }) => {
      // Optimistically update the list and detail caches
      const listKey = QUERY_KEYS.products.lists();
      const detailKey = getProductDetailQueryKey(id);
      const detailEditKey = QUERY_KEYS.products.detailEdit(id);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: detailEditKey }),
      ]);

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData<ProductListCacheValue>({ queryKey: listKey });
      const previousDetail = queryClient.getQueryData<ProductWithImages>(detailKey);
      const previousDetailEdit = queryClient.getQueryData<ProductWithImages>(detailEditKey);

      // Optimistically update lists
      queryClient.setQueriesData({ queryKey: listKey }, (old: ProductListCacheValue) =>
        patchProductListCacheValue(old, id, field, value)
      );

      // Optimistically update detail
      queryClient.setQueryData(detailKey, (old: ProductWithImages | undefined) =>
        old ? { ...old, [field]: value } : old
      );
      queryClient.setQueryData(detailEditKey, (old: ProductWithImages | undefined) =>
        old ? { ...old, [field]: value } : old
      );

      return { previousLists, previousDetail, previousDetailEdit };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      context?.previousLists.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(getProductDetailQueryKey(id), context.previousDetail);
      }
      if (context?.previousDetailEdit !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.products.detailEdit(id), context.previousDetailEdit);
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
    onSuccess: async (savedProduct) => {
      syncUpdatedProductAcrossCaches(queryClient, savedProduct);
    },
    invalidate: async (queryClient, _, variables) => {
      await markUpdatedProductCachesStale(queryClient, variables.id);
    },
  });
}

import {
  batchEditProducts,
  bulkSetProductsArchivedState,
  createProduct,
  deleteProduct,
  queueMarketplaceCopyDebrandBatch,
  updateProduct,
} from '@/features/products/api/products';
import type {
  ProductBatchEditRequest,
  ProductBatchEditResponse,
  ProductBulkArchiveResponse,
  ProductBulkImagesBase64Response,
  ProductMarketplaceCopyDebrandBatchRequest,
  ProductMarketplaceCopyDebrandBatchResponse,
  ProductWithImages,
} from '@/shared/contracts/products';
import type { CreateMutation, UpdateMutation, DeleteMutation } from '@/shared/contracts/ui/queries';
import { AppError, operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import {
  useCreateMutationV2,
  useDeleteMutationV2,
  useUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { delay } from '@/shared/utils/time-utils';

import { invalidateProductsAndCounts } from './productCache';

export { useUpdateProductField } from './useProductFieldMutation';

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

// Retry only transient/network errors — not validation (400) or not-found (404)
const isTransientError = (error: Error): boolean => {
  if (error instanceof AppError) return error.retryable;
  const msg = error.message.toLowerCase();
  return /timeout|network|connection|refused|reset|fetch/i.test(msg);
};

export function useCreateProduct(): CreateMutation<ProductWithImages, FormData> {
  return useCreateMutationV2({
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
  return useUpdateMutationV2({
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
  return useDeleteMutationV2({
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
  return useDeleteMutationV2({
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

export type BulkSetProductsArchivedStateInput = {
  productIds: string[];
  archived: boolean;
};

export function useBulkSetProductsArchivedState(): UpdateMutation<
  ProductBulkArchiveResponse,
  BulkSetProductsArchivedStateInput
> {
  return useUpdateMutationV2({
    mutationFn: async ({
      productIds,
      archived,
    }: BulkSetProductsArchivedStateInput): Promise<ProductBulkArchiveResponse> =>
      bulkSetProductsArchivedState(productIds, archived),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useBulkSetProductsArchivedState',
      operation: 'update',
      resource: 'products.archived-state.bulk',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'archive', 'bulk'],
      description: 'Sets archived state for products in bulk.',
    },
    invalidate: async (queryClient) => {
      await Promise.all([
        invalidateProductsAndCounts(queryClient),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.details(),
          refetchType: 'none',
        }),
      ]);
    },
  });
}

export function useBulkConvertImagesToBase64(): UpdateMutation<
  ProductBulkImagesBase64Response,
  string[]
> {
  return useUpdateMutationV2({
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

export function useBulkEditProductFields(): UpdateMutation<
  ProductBatchEditResponse,
  ProductBatchEditRequest
> {
  return useUpdateMutationV2({
    mutationFn: async (request: ProductBatchEditRequest): Promise<ProductBatchEditResponse> =>
      batchEditProducts(request),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useBulkEditProductFields',
      operation: 'update',
      resource: 'products.fields.bulk',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'fields', 'bulk-edit'],
      description: 'Applies product field batch edit operations.',
    },
    invalidate: async (queryClient, response) => {
      if (response.dryRun) return;
      await Promise.all([
        invalidateProductsAndCounts(queryClient),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.details(),
          refetchType: 'none',
        }),
      ]);
    },
  });
}

export function useQueueMarketplaceCopyDebrandBatch(): UpdateMutation<
  ProductMarketplaceCopyDebrandBatchResponse,
  ProductMarketplaceCopyDebrandBatchRequest
> {
  return useUpdateMutationV2({
    mutationFn: async (
      request: ProductMarketplaceCopyDebrandBatchRequest
    ): Promise<ProductMarketplaceCopyDebrandBatchResponse> =>
      queueMarketplaceCopyDebrandBatch(request),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useQueueMarketplaceCopyDebrandBatch',
      operation: 'update',
      resource: 'products.marketplace-copy-debrand.bulk',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'marketplace-copy', 'debrand', 'bulk'],
      description: 'Queues marketplace copy debrand batch operations.',
    },
    invalidate: async (queryClient) => {
      await Promise.all([
        invalidateProductsAndCounts(queryClient),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.details(),
          refetchType: 'none',
        }),
      ]);
    },
  });
}

export function useDuplicateProduct(): CreateMutation<ProductWithImages, { id: string; sku: string }> {
  return useCreateMutationV2({
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

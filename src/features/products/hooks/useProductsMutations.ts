'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type { ProductWithImages } from '@/shared/contracts/products';
import { operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { 
  CreateMutation, 
  UpdateMutation, 
  DeleteMutation 
} from '@/shared/contracts/ui';
import { delay } from '@/shared/utils';

import {
  invalidateProducts,
  invalidateProductsAndCounts,
  invalidateProductsAndDetail,
} from './productCache';

interface UpdateProductPayload {
  id: string;
  data: Partial<ProductWithImages>;
}

export function useCreateProduct(): CreateMutation<ProductWithImages, FormData> {
  const queryClient = useQueryClient();

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
    },
    onSuccess: async (): Promise<void> => {
      // Small delay to ensure DB consistency before refetch
      await delay(500);
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProduct(): UpdateMutation<ProductWithImages, UpdateProductPayload> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2({
    mutationFn: ({ id, data }: UpdateProductPayload) => updateProduct(id, data),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useUpdateProduct',
      operation: 'update',
      resource: 'products',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'update'],
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useDeleteProduct(): DeleteMutation<{ success: boolean }, string> {
  const queryClient = useQueryClient();

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
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useBulkDeleteProducts(): DeleteMutation<void, string[]> {
  const queryClient = useQueryClient();

  return createDeleteMutationV2({
    mutationFn: async (ids: string[]): Promise<void> => {
      const responses = await Promise.all(
        ids.map((id: string) => deleteProduct(id))
      );
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
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useConvertAllImagesToBase64(): UpdateMutation<{ ok: boolean }, void> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64/all');
      return { ok: true };
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useConvertAllImagesToBase64',
      operation: 'update',
      resource: 'products.images.base64.all',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'images', 'base64'],
    },
    onSuccess: () => {
      void invalidateProducts(queryClient);
    },
  });
}

export function useBulkConvertImagesToBase64(): UpdateMutation<{ ok: boolean }, string[]> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2({
    mutationFn: async (productIds: string[]): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64', { productIds });
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
    },
    onSuccess: () => {
      void invalidateProducts(queryClient);
    },
  });
}

export function useDuplicateProduct(): CreateMutation<{ id: string }, { id: string; sku: string }> {
  const queryClient = useQueryClient();

  return createCreateMutationV2({
    mutationFn: async ({ id, sku }): Promise<{ id: string }> =>
      await api.post<{ id: string }>(`/api/products/${id}/duplicate`, { sku }),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useDuplicateProduct',
      operation: 'create',
      resource: 'products.duplicate',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'duplicate'],
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProductField(): UpdateMutation<void, { id: string; field: string; value: unknown }> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2({
    mutationFn: async ({ id, field, value }): Promise<void> => {
      await api.patch<unknown>(`/api/products/${id}`, { [field]: value });
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useUpdateProductField',
      operation: 'update',
      resource: 'products.field',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'field-update'],
    },
    onSuccess: async (_, variables): Promise<void> => {
      await invalidateProductsAndDetail(queryClient, variables.id);
    },
  });
}

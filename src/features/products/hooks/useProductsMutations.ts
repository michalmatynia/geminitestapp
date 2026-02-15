'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type { ProductWithImages } from '@/features/products/types';
import { operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutation,
  createUpdateMutation,
  createDeleteMutation,
} from '@/shared/lib/query-factories';
import type { DeleteResponse } from '@/shared/types/api/api';
import type { 
  CreateMutation, 
  UpdateMutation, 
  DeleteMutation 
} from '@/shared/types/query-result-types';
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

  return createCreateMutation({
    mutationFn: (formData: FormData) => createProduct(formData),
    options: {
      onSuccess: async (): Promise<void> => {
        // Small delay to ensure DB consistency before refetch
        await delay(500);
        await invalidateProductsAndCounts(queryClient);
      },
    },
  });
}

export function useUpdateProduct(): UpdateMutation<ProductWithImages, UpdateProductPayload> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: ({ id, data }: UpdateProductPayload) => updateProduct(id, data),
    options: {
      onSuccess: async (): Promise<void> => {
        await invalidateProductsAndCounts(queryClient);
      },
    },
  });
}

export function useDeleteProduct(): DeleteMutation {
  const queryClient = useQueryClient();

  return createDeleteMutation({
    mutationFn: (id: string) => deleteProduct(id),
    options: {
      onSuccess: async (): Promise<void> => {
        await invalidateProductsAndCounts(queryClient);
      },
    },
  });
}

export function useBulkDeleteProducts(): UpdateMutation<{ success: boolean }, string[]> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: async (ids: string[]): Promise<{ success: boolean }> => {
      const responses = await Promise.all(
        ids.map((id: string) => deleteProduct(id))
      );
      if (responses.some((r: { success: boolean }) => !r.success)) {
        throw operationFailedError('Failed to delete some products');
      }
      return { success: true };
    },
    options: {
      onSuccess: async (): Promise<void> => {
        await invalidateProductsAndCounts(queryClient);
      },
    },
  });
}

export function useConvertAllImagesToBase64(): UpdateMutation<{ ok: boolean }, void> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64/all');
      return { ok: true };
    },
    options: {
      onSuccess: () => {
        void invalidateProducts(queryClient);
      },
    },
  });
}

export function useBulkConvertImagesToBase64(): UpdateMutation<{ ok: boolean }, string[]> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: async (productIds: string[]): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64', { productIds });
      return { ok: true };
    },
    options: {
      onSuccess: () => {
        void invalidateProducts(queryClient);
      },
    },
  });
}

export function useDuplicateProduct(): CreateMutation<{ id: string }, { id: string; sku: string }> {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: async ({ id, sku }): Promise<{ id: string }> =>
      await api.post<{ id: string }>(`/api/products/${id}/duplicate`, { sku }),
    options: {
      onSuccess: async (): Promise<void> => {
        await invalidateProductsAndCounts(queryClient);
      },
    },
  });
}

export function useUpdateProductField(): UpdateMutation<void, { id: string; field: string; value: unknown }> {
  const queryClient = useQueryClient();

  return createUpdateMutation({
    mutationFn: async ({ id, field, value }): Promise<void> => {
      await api.patch<unknown>(`/api/products/${id}`, { [field]: value });
    },
    onSuccess: async (_, variables): Promise<void> => {
      await invalidateProductsAndDetail(queryClient, variables.id);
    },
  });
}

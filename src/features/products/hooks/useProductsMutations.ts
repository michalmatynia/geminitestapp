'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type { ProductWithImages } from '@/features/products/types';
import { operationFailedError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import type { DeleteResponse } from '@/shared/types/api/api';
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

export function useCreateProduct(): UseMutationResult<
  ProductWithImages,
  Error,
  FormData,
  unknown
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => createProduct(formData),
    onSuccess: async (): Promise<void> => {
      // Small delay to ensure DB consistency before refetch
      await delay(500);
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  ProductWithImages,
  Error,
  UpdateProductPayload,
  unknown
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateProductPayload) => updateProduct(id, data),
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useDeleteProduct(): UseMutationResult<
  DeleteResponse,
  Error,
  string,
  unknown
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useBulkDeleteProducts(): UseMutationResult<{ success: boolean }, Error, string[], unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ success: boolean }> => {
      const responses = await Promise.all(
        ids.map((id: string) => deleteProduct(id))
      );
      if (responses.some((r: { success: boolean }) => !r.success)) {
        throw operationFailedError('Failed to delete some products');
      }
      return { success: true };
    },
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useConvertAllImagesToBase64(): UseMutationResult<{ ok: boolean }, Error, void, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64/all');
      return { ok: true };
    },
    onSuccess: () => {
      void invalidateProducts(queryClient);
    },
  });
}

export function useBulkConvertImagesToBase64(): UseMutationResult<{ ok: boolean }, Error, string[], unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds: string[]): Promise<{ ok: boolean }> => {
      await api.post<unknown>('/api/products/images/base64', { productIds });
      return { ok: true };
    },
    onSuccess: () => {
      void invalidateProducts(queryClient);
    },
  });
}

export function useDuplicateProduct(): UseMutationResult<{ id: string }, Error, { id: string; sku: string }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sku }): Promise<{ id: string }> =>
      await api.post<{ id: string }>(`/api/products/${id}/duplicate`, { sku }),
    onSuccess: async (): Promise<void> => {
      await invalidateProductsAndCounts(queryClient);
    },
  });
}

export function useUpdateProductField(): UseMutationResult<void, Error, { id: string; field: string; value: unknown }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, field, value }): Promise<void> => {
      await api.patch<unknown>(`/api/products/${id}`, { [field]: value });
    },
    onSuccess: async (_, variables): Promise<void> => {
      await invalidateProductsAndDetail(queryClient, variables.id);
    },
  });
}

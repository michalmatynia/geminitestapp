'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { createProduct, updateProduct, deleteProduct } from '@/features/products/api/products';
import type { ProductWithImages } from '@/features/products/types';
import type { DeleteResponse } from '@/shared/types/api';
import { delay } from '@/shared/utils';

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-count'] }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-count'] }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-count'] }),
      ]);
    },
  });
}

export function useConvertAllImagesToBase64(): UseMutationResult<{ ok: boolean }, Error, void, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/products/images/base64/all', { method: 'POST' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to convert images');
      }
      return { ok: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDuplicateProduct(): UseMutationResult<{ id: string }, Error, { id: string; sku: string }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sku }) => {
      const res = await fetch(`/api/products/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to duplicate product');
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products-count'] });
    },
  });
}

export function useUpdateProductField(): UseMutationResult<void, Error, { id: string; field: string; value: any }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, field, value }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || `Failed to update ${field}`);
      }
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from '@/features/products/types/drafts';

export const draftKeys = {
  all: ['drafts'] as const,
  detail: (id: string) => ['drafts', id] as const,
};

export function useDrafts(): UseQueryResult<ProductDraft[]> {
  return useQuery({
    queryKey: draftKeys.all,
    queryFn: async (): Promise<ProductDraft[]> => {
      const res = await fetch('/api/drafts');
      if (!res.ok) throw new Error('Failed to load drafts');
      return (await res.json()) as ProductDraft[];
    },
  });
}

export function useDraft(id: string | null): UseQueryResult<ProductDraft> {
  return useQuery({
    queryKey: draftKeys.detail(id || ''),
    queryFn: async (): Promise<ProductDraft> => {
      const res = await fetch(`/api/drafts/${id}`);
      if (!res.ok) throw new Error('Failed to load draft');
      return (await res.json()) as ProductDraft;
    },
    enabled: !!id,
  });
}

export function useCreateDraft(): UseMutationResult<ProductDraft, Error, CreateProductDraftInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductDraftInput): Promise<ProductDraft> => {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create draft');
      return (await res.json()) as ProductDraft;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

export function useUpdateDraft(): UseMutationResult<ProductDraft, Error, { id: string; input: UpdateProductDraftInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProductDraftInput }): Promise<ProductDraft> => {
      const res = await fetch(`/api/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update draft');
      return (await res.json()) as ProductDraft;
    },
    onSuccess: (data: ProductDraft) => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
      void queryClient.invalidateQueries({ queryKey: draftKeys.detail(data.id) });
    },
  });
}

export function useDeleteDraft(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete draft');
      return id;
    },
    onSuccess: (deletedId: string): void => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
      void queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}
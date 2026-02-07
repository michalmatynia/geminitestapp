'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from '@/features/products/types/drafts';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const draftKeys = QUERY_KEYS.drafts;

export function useDrafts(): UseQueryResult<ProductDraft[]> {
  return useQuery({
    queryKey: draftKeys.all,
    queryFn: () => api.get<ProductDraft[]>('/api/drafts'),
  });
}

export function useDraft(id: string | null): UseQueryResult<ProductDraft> {
  return useQuery({
    queryKey: draftKeys.detail(id || ''),
    queryFn: () => api.get<ProductDraft>(`/api/drafts/${id}`),
    enabled: !!id,
  });
}

export function useCreateDraft(): UseMutationResult<ProductDraft, Error, CreateProductDraftInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductDraftInput) => api.post<ProductDraft>('/api/drafts', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

export function useUpdateDraft(): UseMutationResult<ProductDraft, Error, { id: string; input: UpdateProductDraftInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftInput }) => 
      api.put<ProductDraft>(`/api/drafts/${id}`, input),
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
      await api.delete(`/api/drafts/${id}`);
      return id;
    },
    onSuccess: (deletedId: string): void => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
      void queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}

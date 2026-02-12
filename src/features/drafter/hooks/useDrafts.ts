'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from '@/features/products/types/drafts';
import { api } from '@/shared/lib/api-client';
import {
  invalidateDraftDetail,
  invalidateDrafts,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const draftKeys = QUERY_KEYS.drafts;

export function useDrafts(): UseQueryResult<ProductDraft[]> {
  return useQuery({
    queryKey: draftKeys.all,
    queryFn: () => api.get<ProductDraft[]>('/api/drafts', { cache: 'no-store' }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

export function useDraft(id: string | null): UseQueryResult<ProductDraft> {
  return useQuery({
    queryKey: draftKeys.detail(id || ''),
    queryFn: () => api.get<ProductDraft>(`/api/drafts/${id}`, { cache: 'no-store' }),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

export function useCreateDraft(): UseMutationResult<ProductDraft, Error, CreateProductDraftInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductDraftInput) => api.post<ProductDraft>('/api/drafts', input),
    onSuccess: (created: ProductDraft) => {
      queryClient.setQueryData<ProductDraft[]>(draftKeys.all, (current: ProductDraft[] | undefined) => {
        if (!current) return [created];
        return [created, ...current];
      });
      queryClient.setQueryData<ProductDraft>(draftKeys.detail(created.id), created);
      void invalidateDrafts(queryClient);
    },
  });
}

export function useUpdateDraft(): UseMutationResult<ProductDraft, Error, { id: string; input: UpdateProductDraftInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftInput }) => 
      api.put<ProductDraft>(`/api/drafts/${id}`, input),
    onSuccess: (data: ProductDraft) => {
      queryClient.setQueryData<ProductDraft[]>(draftKeys.all, (current: ProductDraft[] | undefined) => {
        if (!current) return [data];
        const next = current.map((draft: ProductDraft) =>
          draft.id === data.id ? { ...draft, ...data } : draft
        );
        if (next.some((draft: ProductDraft) => draft.id === data.id)) {
          return next;
        }
        return [data, ...next];
      });
      queryClient.setQueryData<ProductDraft>(draftKeys.detail(data.id), data);
      void invalidateDrafts(queryClient);
      void invalidateDraftDetail(queryClient, data.id);
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
      queryClient.setQueryData<ProductDraft[]>(draftKeys.all, (current: ProductDraft[] | undefined) => {
        if (!current) return current;
        return current.filter((draft: ProductDraft) => draft.id !== deletedId);
      });
      void invalidateDrafts(queryClient);
      queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}

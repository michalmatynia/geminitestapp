'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ProductDraft, CreateProductDraftInput, UpdateProductDraftInput } from '@/features/products/types/drafts';
import { api } from '@/shared/lib/api-client';
import {
  invalidateDraftDetail,
  invalidateDrafts,
} from '@/shared/lib/query-invalidation';
import { draftKeys } from '@/shared/lib/query-key-exports';
import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult 
} from '@/shared/types/query-result-types';

export { draftKeys };

export function useDraftQueries(): ListQuery<ProductDraft> {
  return createListQuery({
    queryKey: draftKeys.lists(),
    queryFn: () => api.get<ProductDraft[]>('/api/drafts', { cache: 'no-store' }),
    options: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    }
  });
}

export function useDraft(id: string | null): SingleQuery<ProductDraft> {
  return createSingleQuery({
    queryKey: draftKeys.detail(id || ''),
    queryFn: () => api.get<ProductDraft>(`/api/drafts/${id}`, { cache: 'no-store' }),
    options: {
      enabled: !!id,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    }
  });
}

export function useCreateDraft(): MutationResult<ProductDraft, CreateProductDraftInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: CreateProductDraftInput) => api.post<ProductDraft>('/api/drafts', input),
    options: {
      onSuccess: (created: ProductDraft) => {
        queryClient.setQueryData<ProductDraft[]>(draftKeys.lists(), (current: ProductDraft[] | undefined) => {
          if (!current) return [created];
          return [created, ...current];
        });
        queryClient.setQueryData<ProductDraft>(draftKeys.detail(created.id), created);
        void invalidateDrafts(queryClient);
      },
    }
  });
}

export function useUpdateDraft(): MutationResult<ProductDraft, { id: string; input: UpdateProductDraftInput }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftInput }) => 
      api.put<ProductDraft>(`/api/drafts/${id}`, input),
    options: {
      onSuccess: (data: ProductDraft) => {
        queryClient.setQueryData<ProductDraft[]>(draftKeys.lists(), (current: ProductDraft[] | undefined) => {
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
    }
  });
}

export function useDeleteDraft(): MutationResult<string, string> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: async (id: string): Promise<string> => {
      await api.delete(`/api/drafts/${id}`);
      return id;
    },
    options: {
      onSuccess: (deletedId: string): void => {
        queryClient.setQueryData<ProductDraft[]>(draftKeys.lists(), (current: ProductDraft[] | undefined) => {
          if (!current) return current;
          return current.filter((draft: ProductDraft) => draft.id !== deletedId);
        });
        void invalidateDrafts(queryClient);
        queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
      },
    }
  });
}

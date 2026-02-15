'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ProductDraftDto, CreateProductDraftDto, UpdateProductDraftDto } from '@/features/products/types/drafts';
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

export function useDraftQueries(): ListQuery<ProductDraftDto> {
  return createListQuery({
    queryKey: draftKeys.lists(),
    queryFn: () => api.get<ProductDraftDto[]>('/api/drafts', { cache: 'no-store' }),
    options: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    }
  });
}

export function useDraft(id: string | null): SingleQuery<ProductDraftDto> {
  return createSingleQuery({
    queryKey: (resolvedId) => draftKeys.detail(resolvedId),
    queryFn: () => api.get<ProductDraftDto>(`/api/drafts/${id}`, { cache: 'no-store' }),
    id,
    options: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    }
  });
}

export function useCreateDraft(): MutationResult<ProductDraftDto, CreateProductDraftDto> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: CreateProductDraftDto) => api.post<ProductDraftDto>('/api/drafts', input),
    options: {
      onSuccess: (created: ProductDraftDto) => {
        queryClient.setQueryData<ProductDraftDto[]>(draftKeys.lists(), (current: ProductDraftDto[] | undefined) => {
          if (!current) return [created];
          return [created, ...current];
        });
        queryClient.setQueryData<ProductDraftDto>(draftKeys.detail(created.id), created);
        void invalidateDrafts(queryClient);
      },
    }
  });
}

export function useUpdateDraft(): MutationResult<ProductDraftDto, { id: string; input: UpdateProductDraftDto }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftDto }) => 
      api.put<ProductDraftDto>(`/api/drafts/${id}`, input),
    options: {
      onSuccess: (data: ProductDraftDto) => {
        queryClient.setQueryData<ProductDraftDto[]>(draftKeys.lists(), (current: ProductDraftDto[] | undefined) => {
          if (!current) return [data];
          const next = current.map((draft: ProductDraftDto) =>
            draft.id === data.id ? { ...draft, ...data } : draft
          );
          if (next.some((draft: ProductDraftDto) => draft.id === data.id)) {
            return next;
          }
          return [data, ...next];
        });
        queryClient.setQueryData<ProductDraftDto>(draftKeys.detail(data.id), data);
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
        queryClient.setQueryData<ProductDraftDto[]>(draftKeys.lists(), (current: ProductDraftDto[] | undefined) => {
          if (!current) return current;
          return current.filter((draft: ProductDraftDto) => draft.id !== deletedId);
        });
        void invalidateDrafts(queryClient);
        queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
      },
    }
  });
}

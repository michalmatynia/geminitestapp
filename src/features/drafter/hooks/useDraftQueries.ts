'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ProductDraftDto, CreateProductDraftDto, UpdateProductDraftDto } from '@/features/products/types/drafts';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateDraftDetail,
  invalidateDrafts,
} from '@/shared/lib/query-invalidation';
import { draftKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult 
} from '@/shared/types/query-result-types';

export { draftKeys };

export function useDraftQueries(): ListQuery<ProductDraftDto> {
  const queryKey = draftKeys.lists();
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<ProductDraftDto[]>('/api/drafts', { cache: 'no-store' }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    meta: {
      source: 'drafter.hooks.useDraftQueries',
      operation: 'list',
      resource: 'drafts',
      queryKey,
      tags: ['drafts', 'list'],
    },
  });
}

export function useDraft(id: string | null): SingleQuery<ProductDraftDto> {
  return createSingleQueryV2({
    queryKey: (resolvedId) => draftKeys.detail(resolvedId),
    queryFn: () => api.get<ProductDraftDto>(`/api/drafts/${id}`, { cache: 'no-store' }),
    id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    meta: {
      source: 'drafter.hooks.useDraft',
      operation: 'detail',
      resource: 'drafts.detail',
      tags: ['drafts', 'detail'],
    },
  });
}

export function useCreateDraft(): MutationResult<ProductDraftDto, CreateProductDraftDto> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: (input: CreateProductDraftDto) => api.post<ProductDraftDto>('/api/drafts', input),
    mutationKey: draftKeys.lists(),
    meta: {
      source: 'drafter.hooks.useCreateDraft',
      operation: 'create',
      resource: 'drafts',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'create'],
    },
    onSuccess: (created: ProductDraftDto) => {
      queryClient.setQueryData<ProductDraftDto[]>(draftKeys.lists(), (current: ProductDraftDto[] | undefined) => {
        if (!current) return [created];
        return [created, ...current];
      });
      queryClient.setQueryData<ProductDraftDto>(draftKeys.detail(created.id), created);
      void invalidateDrafts(queryClient);
    },
  });
}

export function useUpdateDraft(): MutationResult<ProductDraftDto, { id: string; input: UpdateProductDraftDto }> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftDto }) => 
      api.put<ProductDraftDto>(`/api/drafts/${id}`, input),
    mutationKey: draftKeys.lists(),
    meta: {
      source: 'drafter.hooks.useUpdateDraft',
      operation: 'update',
      resource: 'drafts',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'update'],
    },
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
  });
}

export function useDeleteDraft(): MutationResult<string, string> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: async (id: string): Promise<string> => {
      await api.delete(`/api/drafts/${id}`);
      return id;
    },
    mutationKey: draftKeys.lists(),
    meta: {
      source: 'drafter.hooks.useDeleteDraft',
      operation: 'delete',
      resource: 'drafts',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'delete'],
    },
    onSuccess: (deletedId: string): void => {
      queryClient.setQueryData<ProductDraftDto[]>(draftKeys.lists(), (current: ProductDraftDto[] | undefined) => {
        if (!current) return current;
        return current.filter((draft: ProductDraftDto) => draft.id !== deletedId);
      });
      void invalidateDrafts(queryClient);
      queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}

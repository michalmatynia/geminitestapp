'use client';

import type {
  ProductDraftDto,
  CreateProductDraftDto,
  UpdateProductDraftDto,
} from '@/shared/contracts/products';
import type { ListQuery, SingleQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateDraftDetail, invalidateDrafts } from '@/shared/lib/query-invalidation';
import { draftKeys } from '@/shared/lib/query-key-exports';

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
      domain: 'drafter',
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
      domain: 'drafter',
      tags: ['drafts', 'detail'],
    },
  });
}

export function useCreateDraft(): MutationResult<ProductDraftDto, CreateProductDraftDto> {
  return createCreateMutationV2({
    mutationFn: (input: CreateProductDraftDto) => api.post<ProductDraftDto>('/api/drafts', input),
    mutationKey: draftKeys.lists(),
    meta: {
      source: 'drafter.hooks.useCreateDraft',
      operation: 'create',
      resource: 'drafts',
      domain: 'drafter',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'create'],
    },
    invalidate: async (queryClient, created) => {
      queryClient.setQueryData<ProductDraftDto[]>(
        draftKeys.lists(),
        (current: ProductDraftDto[] | undefined) => {
          if (!current) return [created];
          return [created, ...current];
        }
      );
      queryClient.setQueryData<ProductDraftDto>(draftKeys.detail(created.id), created);
      return invalidateDrafts(queryClient);
    },
  });
}

export function useUpdateDraft(): MutationResult<
  ProductDraftDto,
  { id: string; input: UpdateProductDraftDto }
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductDraftDto }) =>
      api.put<ProductDraftDto>(`/api/drafts/${id}`, input),
    mutationKey: draftKeys.lists(),
    meta: {
      source: 'drafter.hooks.useUpdateDraft',
      operation: 'update',
      resource: 'drafts',
      domain: 'drafter',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'update'],
    },
    invalidate: async (queryClient, data) => {
      queryClient.setQueryData<ProductDraftDto[]>(
        draftKeys.lists(),
        (current: ProductDraftDto[] | undefined) => {
          if (!current) return [data];
          const next = current.map((draft: ProductDraftDto) =>
            draft.id === data.id ? { ...draft, ...data } : draft
          );
          if (next.some((draft: ProductDraftDto) => draft.id === data.id)) {
            return next;
          }
          return [data, ...next];
        }
      );
      queryClient.setQueryData<ProductDraftDto>(draftKeys.detail(data.id), data);
      void invalidateDrafts(queryClient);
      return invalidateDraftDetail(queryClient, data.id);
    },
  });
}

export function useDeleteDraft(): MutationResult<string, string> {
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
      domain: 'drafter',
      mutationKey: draftKeys.lists(),
      tags: ['drafts', 'delete'],
    },
    invalidate: async (queryClient, deletedId) => {
      queryClient.setQueryData<ProductDraftDto[]>(
        draftKeys.lists(),
        (current: ProductDraftDto[] | undefined) => {
          if (!current) return current;
          return current.filter((draft: ProductDraftDto) => draft.id !== deletedId);
        }
      );
      void invalidateDrafts(queryClient);
      queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
    },
  });
}

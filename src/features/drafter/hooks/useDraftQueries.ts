'use client';

import type {
  ProductDraft,
  CreateProductDraftInput,
  UpdateProductDraftInput,
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
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const draftKeys = QUERY_KEYS.drafter;

export { draftKeys };

export function useDraftQueries(notebookId?: string): ListQuery<ProductDraft> {
  const queryKey = draftKeys.list(notebookId ?? 'all');
  return createListQueryV2<ProductDraft>({
    queryKey,
    queryFn: () =>
      api.get<ProductDraft[]>('/api/drafts', {
        params: notebookId ? { notebookId } : undefined,
      }),
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

export function useDraft(id: string | null): SingleQuery<ProductDraft> {
  const queryKey = draftKeys.detail(id ?? 'none');
  return createSingleQueryV2<ProductDraft>({
    id,
    queryKey: (noteId) => draftKeys.detail(noteId),
    queryFn: () => api.get<ProductDraft>(`/api/drafts/${id}`),
    enabled: !!id,
    meta: {
      source: 'drafter.hooks.useDraft',
      operation: 'detail',
      resource: 'drafts.detail',
      domain: 'drafter',
      queryKey,
      tags: ['drafts', 'detail'],
    },
  });
}

export function useCreateDraftMutation(): MutationResult<ProductDraft, CreateProductDraftInput> {
  return createCreateMutationV2<ProductDraft, CreateProductDraftInput>({
    mutationFn: (data) => api.post<ProductDraft>('/api/drafts', data),
    meta: {
      source: 'drafter.hooks.useCreateDraftMutation',
      operation: 'create',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'create'],
    },
    invalidateKeys: [draftKeys.lists()],
  });
}

export function useUpdateDraftMutation(): MutationResult<
  ProductDraft,
  { id: string; data: UpdateProductDraftInput }
  > {
  return createUpdateMutationV2<ProductDraft, { id: string; data: UpdateProductDraftInput }>({
    mutationFn: ({ id, data }) => api.put<ProductDraft>(`/api/drafts/${id}`, data),
    meta: {
      source: 'drafter.hooks.useUpdateDraftMutation',
      operation: 'update',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'update'],
    },
    invalidate: (queryClient, data) => {
      queryClient.setQueryData(draftKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

export function useDeleteDraftMutation(): MutationResult<void, string> {
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/drafts/${id}`),
    meta: {
      source: 'drafter.hooks.useDeleteDraftMutation',
      operation: 'delete',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'delete'],
    },
    invalidate: (queryClient, _, deletedId) => {
      queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

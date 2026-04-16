import type { IdDataDto } from '@/shared/contracts/base';
import type { CreateProductDraftInput, ProductDraft, UpdateProductDraftInput } from '@/shared/contracts/products/drafts';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { draftKeys } from '@/shared/lib/query-key-exports';

const draftListKey = (notebookId?: string) =>
  [...draftKeys.lists(), { notebookId: notebookId ?? 'all' }] as const;

export { draftKeys };

type DraftQueriesOptions = {
  enabled?: boolean;
};

export function useDraftQueries(
  notebookId?: string,
  options?: DraftQueriesOptions
): ListQuery<ProductDraft> {
  const queryKey = draftListKey(notebookId);

  return createListQueryV2<ProductDraft>({
    queryKey,
    queryFn: (context) =>
      api.get<ProductDraft[]>('/api/drafts', {
        params: notebookId ? { notebookId } : undefined,
        signal: context.signal,
      }),
    enabled: options?.enabled ?? true,
    meta: {
      source: 'shared.hooks.useDraftQueries',
      operation: 'list',
      resource: 'drafts',
      domain: 'drafter',
      queryKey,
      tags: ['drafts', 'list'],
      description: 'Loads drafts.',
    },
  });
}

export function useDraft(id: string | null): SingleQuery<ProductDraft> {
  const queryKey = draftKeys.detail(id ?? 'none');

  return createSingleQueryV2<ProductDraft>({
    id,
    queryKey: (draftId) => draftKeys.detail(draftId),
    queryFn: () => api.get<ProductDraft>(`/api/drafts/${id}`),
    enabled: Boolean(id),
    meta: {
      source: 'shared.hooks.useDraft',
      operation: 'detail',
      resource: 'drafts.detail',
      domain: 'drafter',
      queryKey,
      tags: ['drafts', 'detail'],
      description: 'Loads drafts detail.',
    },
  });
}

export function useCreateDraftMutation(): MutationResult<ProductDraft, CreateProductDraftInput> {
  return createCreateMutationV2<ProductDraft, CreateProductDraftInput>({
    mutationFn: (data) => api.post<ProductDraft>('/api/drafts', data),
    meta: {
      source: 'shared.hooks.useCreateDraftMutation',
      operation: 'create',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'create'],
      description: 'Creates drafts.',
    },
    invalidateKeys: [draftKeys.lists()],
  });
}

export function useUpdateDraftMutation(): MutationResult<
  ProductDraft,
  IdDataDto<UpdateProductDraftInput>
> {
  return createUpdateMutationV2<ProductDraft, IdDataDto<UpdateProductDraftInput>>({
    mutationFn: ({ id, data }) => api.put<ProductDraft>(`/api/drafts/${id}`, data),
    meta: {
      source: 'shared.hooks.useUpdateDraftMutation',
      operation: 'update',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'update'],
      description: 'Updates drafts.',
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
      source: 'shared.hooks.useDeleteDraftMutation',
      operation: 'delete',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'delete'],
      description: 'Deletes drafts.',
    },
    invalidate: (queryClient, _, deletedId) => {
      queryClient.removeQueries({ queryKey: draftKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

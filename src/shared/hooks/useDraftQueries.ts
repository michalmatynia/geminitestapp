import type { IdDataDto } from '@/shared/contracts/base';
import type { CreateProductDraftInput, ProductDraft, UpdateProductDraftInput } from '@/shared/contracts/products/drafts';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import {
  useCreateMutationV2,
  useDeleteMutationV2,
  useListQueryV2,
  useSingleQueryV2,
  useUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { draftKeys } from '@/shared/lib/query-key-exports';

const draftListKey = (notebookId?: string) =>
  [...draftKeys.lists(), { notebookId: notebookId ?? 'all' }] as const;

export { draftKeys };

const upsertDraftInList = (
  drafts: ProductDraft[] | undefined,
  draft: ProductDraft
): ProductDraft[] => {
  if (!Array.isArray(drafts)) return [draft];
  const existingIndex = drafts.findIndex((entry) => entry.id === draft.id);
  if (existingIndex === -1) return [draft, ...drafts];
  const nextDrafts = drafts.slice();
  nextDrafts[existingIndex] = draft;
  return nextDrafts;
};

const removeDraftFromList = (
  drafts: ProductDraft[] | undefined,
  draftId: string
): ProductDraft[] | undefined => {
  if (!Array.isArray(drafts)) return drafts;
  return drafts.filter((entry) => entry.id !== draftId);
};

const hydrateDraftListCaches = (queryClient: QueryClient, draft: ProductDraft): void => {
  queryClient.setQueryData(draftKeys.detail(draft.id), draft);
  queryClient.setQueriesData<ProductDraft[]>(
    { queryKey: draftKeys.lists() },
    (drafts) => upsertDraftInList(drafts, draft)
  );
};

const removeDraftFromListCaches = (queryClient: QueryClient, draftId: string): void => {
  queryClient.removeQueries({ queryKey: draftKeys.detail(draftId) });
  queryClient.setQueriesData<ProductDraft[]>(
    { queryKey: draftKeys.lists() },
    (drafts) => removeDraftFromList(drafts, draftId)
  );
};

type DraftQueriesOptions = {
  enabled?: boolean;
};

export function useDraftQueries(
  notebookId?: string,
  options?: DraftQueriesOptions
): ListQuery<ProductDraft> {
  const queryKey = draftListKey(notebookId);

  return useListQueryV2<ProductDraft>({
    queryKey,
    queryFn: (context) =>
      api.get<ProductDraft[]>('/api/drafts', {
        params:
          typeof notebookId === 'string' && notebookId.trim().length > 0
            ? { notebookId }
            : undefined,
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

  return useSingleQueryV2<ProductDraft>({
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
  return useCreateMutationV2<ProductDraft, CreateProductDraftInput>({
    mutationFn: (data) => api.post<ProductDraft>('/api/drafts', data),
    meta: {
      source: 'shared.hooks.useCreateDraftMutation',
      operation: 'create',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'create'],
      description: 'Creates drafts.',
    },
    invalidate: async (queryClient, data) => {
      hydrateDraftListCaches(queryClient, data);
      await queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

export function useUpdateDraftMutation(): MutationResult<
  ProductDraft,
  IdDataDto<UpdateProductDraftInput>
> {
  return useUpdateMutationV2<ProductDraft, IdDataDto<UpdateProductDraftInput>>({
    mutationFn: ({ id, data }) => api.put<ProductDraft>(`/api/drafts/${id}`, data),
    meta: {
      source: 'shared.hooks.useUpdateDraftMutation',
      operation: 'update',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'update'],
      description: 'Updates drafts.',
    },
    invalidate: async (queryClient, data) => {
      hydrateDraftListCaches(queryClient, data);
      await queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

export function useDeleteDraftMutation(): MutationResult<void, string> {
  return useDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/drafts/${id}`),
    meta: {
      source: 'shared.hooks.useDeleteDraftMutation',
      operation: 'delete',
      resource: 'drafts',
      domain: 'drafter',
      tags: ['drafts', 'delete'],
      description: 'Deletes drafts.',
    },
    invalidate: async (queryClient, _, deletedId) => {
      removeDraftFromListCaches(queryClient, deletedId);
      await queryClient.invalidateQueries({ queryKey: draftKeys.lists() });
    },
  });
}

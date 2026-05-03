// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';

const {
  apiGetMock,
  createCreateMutationV2Mock,
  createDeleteMutationV2Mock,
  createListQueryV2Mock,
  createUpdateMutationV2Mock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  createCreateMutationV2Mock: vi.fn(),
  createDeleteMutationV2Mock: vi.fn(),
  createListQueryV2Mock: vi.fn(),
  createUpdateMutationV2Mock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (config: unknown) => createListQueryV2Mock(config),
  createSingleQueryV2: vi.fn(),
  createCreateMutationV2: (config: unknown) => createCreateMutationV2Mock(config),
  createDeleteMutationV2: (config: unknown) => createDeleteMutationV2Mock(config),
  createUpdateMutationV2: (config: unknown) => createUpdateMutationV2Mock(config),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import {
  draftKeys,
  useCreateDraftMutation,
  useDeleteDraftMutation,
  useDraftQueries,
  useUpdateDraftMutation,
} from './useDraftQueries';

type MutationConfig = {
  invalidate: (
    queryClient: {
      invalidateQueries: ReturnType<typeof vi.fn>;
      removeQueries?: ReturnType<typeof vi.fn>;
      setQueriesData?: ReturnType<typeof vi.fn>;
      setQueryData?: ReturnType<typeof vi.fn>;
    },
    data: ProductDraft | void,
    variables?: unknown
  ) => Promise<void>;
};

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft =>
  ({
    id: 'draft-template',
    name: 'BattleStock Scrape Template',
    draftKind: 'scrape_template',
    scrapeProfileId: 'battlestock-warhammer-40k-30k',
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    ...overrides,
  }) as ProductDraft;

describe('useDraftQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    createCreateMutationV2Mock.mockReturnValue({ kind: 'create-mutation' });
    createUpdateMutationV2Mock.mockReturnValue({ kind: 'update-mutation' });
    createDeleteMutationV2Mock.mockReturnValue({ kind: 'delete-mutation' });
    apiGetMock.mockResolvedValue([]);
  });

  it('keeps drafts queries enabled by default', async () => {
    const { result } = renderHook(() => useDraftQueries());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];
    const signal = new AbortController().signal;

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual([...draftKeys.lists(), { notebookId: 'all' }]);
    expect(config.enabled).toBe(true);

    await expect(config.queryFn({ signal })).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith('/api/drafts', {
      params: undefined,
      signal,
    });
  });

  it('lets callers defer the initial drafts request', () => {
    renderHook(() => useDraftQueries(undefined, { enabled: false }));
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(config.enabled).toBe(false);
  });

  it('hydrates draft list caches after creating a scrape template', async () => {
    renderHook(() => useCreateDraftMutation());
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
    const draft = createDraft();
    const existingDraft = createDraft({ id: 'standard-draft', draftKind: 'standard' });
    const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
    const setQueryDataMock = vi.fn();
    const setQueriesDataMock = vi.fn((_filters, updater) => {
      expect(updater([existingDraft])).toEqual([draft, existingDraft]);
    });

    await config.invalidate(
      {
        invalidateQueries: invalidateQueriesMock,
        setQueryData: setQueryDataMock,
        setQueriesData: setQueriesDataMock,
      },
      draft
    );

    expect(setQueryDataMock).toHaveBeenCalledWith(draftKeys.detail(draft.id), draft);
    expect(setQueriesDataMock).toHaveBeenCalledWith(
      { queryKey: draftKeys.lists() },
      expect.any(Function)
    );
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: draftKeys.lists() });
  });

  it('updates cached draft lists after changing a draft to a scrape template', async () => {
    renderHook(() => useUpdateDraftMutation());
    const config = createUpdateMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
    const savedDraft = createDraft();
    const staleDraft = createDraft({ draftKind: 'standard', scrapeProfileId: null });
    const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
    const setQueryDataMock = vi.fn();
    const setQueriesDataMock = vi.fn((_filters, updater) => {
      expect(updater([staleDraft])).toEqual([savedDraft]);
    });

    await config.invalidate(
      {
        invalidateQueries: invalidateQueriesMock,
        setQueryData: setQueryDataMock,
        setQueriesData: setQueriesDataMock,
      },
      savedDraft
    );

    expect(setQueryDataMock).toHaveBeenCalledWith(draftKeys.detail(savedDraft.id), savedDraft);
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: draftKeys.lists() });
  });

  it('removes deleted drafts from cached draft lists before refetching', async () => {
    renderHook(() => useDeleteDraftMutation());
    const config = createDeleteMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
    const draft = createDraft();
    const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
    const removeQueriesMock = vi.fn();
    const setQueriesDataMock = vi.fn((_filters, updater) => {
      expect(updater([draft])).toEqual([]);
    });

    await config.invalidate(
      {
        invalidateQueries: invalidateQueriesMock,
        removeQueries: removeQueriesMock,
        setQueriesData: setQueriesDataMock,
      },
      undefined,
      draft.id
    );

    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: draftKeys.detail(draft.id) });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: draftKeys.lists() });
  });
});

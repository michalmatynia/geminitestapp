// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';

const {
  apiGetMock,
  useCreateMutationV2Mock,
  useDeleteMutationV2Mock,
  useListQueryV2Mock,
  useUpdateMutationV2Mock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  useCreateMutationV2Mock: vi.fn(),
  useDeleteMutationV2Mock: vi.fn(),
  useListQueryV2Mock: vi.fn(),
  useUpdateMutationV2Mock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  useListQueryV2: (config: unknown) => useListQueryV2Mock(config),
  useSingleQueryV2: vi.fn(),
  useCreateMutationV2: (config: unknown) => useCreateMutationV2Mock(config),
  useDeleteMutationV2: (config: unknown) => useDeleteMutationV2Mock(config),
  useUpdateMutationV2: (config: unknown) => useUpdateMutationV2Mock(config),
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
    useListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    useCreateMutationV2Mock.mockReturnValue({ kind: 'create-mutation' });
    useUpdateMutationV2Mock.mockReturnValue({ kind: 'update-mutation' });
    useDeleteMutationV2Mock.mockReturnValue({ kind: 'delete-mutation' });
    apiGetMock.mockResolvedValue([]);
  });

  it('keeps drafts queries enabled by default', async () => {
    const { result } = renderHook(() => useDraftQueries());
    const config = useListQueryV2Mock.mock.calls[0]?.[0];
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
    const config = useListQueryV2Mock.mock.calls[0]?.[0];

    expect(config.enabled).toBe(false);
  });

  it('hydrates draft list caches after creating a scrape template', async () => {
    renderHook(() => useCreateDraftMutation());
    const config = useCreateMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
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
    const config = useUpdateMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
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
    const config = useDeleteMutationV2Mock.mock.calls[0]?.[0] as MutationConfig;
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

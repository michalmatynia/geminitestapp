// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (config: unknown) => createListQueryV2Mock(config),
  createSingleQueryV2: vi.fn(),
  createCreateMutationV2: vi.fn(),
  createDeleteMutationV2: vi.fn(),
  createUpdateMutationV2: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import { draftKeys, useDraftQueries } from './useDraftQueries';

describe('useDraftQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
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
});

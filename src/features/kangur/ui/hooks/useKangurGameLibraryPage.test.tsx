import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames, createKangurGameLibraryPageDataFromGames } from '@/features/kangur/games';
import { useKangurGameLibraryPage } from '@/features/kangur/ui/hooks/useKangurGameLibraryPage';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());

const { apiGetMock, ApiErrorMock } = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    apiGetMock: vi.fn(),
    ApiErrorMock: MockApiError,
  };
});

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
  ApiError: ApiErrorMock,
}));

describe('useKangurGameLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
  });

  it('configures the query without placeholder library data', async () => {
    const payload = createKangurGameLibraryPageDataFromGames({
      games: createDefaultKangurGames(),
    });
    apiGetMock.mockResolvedValue(payload);

    const { result } = renderHook(() => useKangurGameLibraryPage({ subject: 'maths' }));
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.placeholderData).toBeUndefined();
    await expect(config.queryFn()).resolves.toEqual(payload);
  });

  it('rethrows access-denied API responses instead of fabricating local page data', async () => {
    apiGetMock.mockRejectedValue(new ApiErrorMock('Not Found', 404));

    renderHook(() => useKangurGameLibraryPage());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    await expect(config.queryFn()).rejects.toBeInstanceOf(ApiErrorMock);
    expect(config.placeholderData).toBeUndefined();
  });

  it('includes gameId in both the query key and API params for exact-game filtering', async () => {
    const payload = createKangurGameLibraryPageDataFromGames({
      filter: { gameId: 'division_groups' },
      games: createDefaultKangurGames(),
    });
    apiGetMock.mockResolvedValue(payload);

    renderHook(() => useKangurGameLibraryPage({ gameId: 'division_groups' }));
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(config.queryKey).toEqual([
      'kangur',
      'game-library-page',
      expect.objectContaining({
        gameId: 'division_groups',
      }),
    ]);

    await expect(config.queryFn()).resolves.toEqual(payload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/game-library-page', {
      params: expect.objectContaining({
        gameId: 'division_groups',
      }),
    });
  });

  it('includes launchableOnly in both the query key and API params for launchability filtering', async () => {
    const payload = createKangurGameLibraryPageDataFromGames({
      filter: { launchableOnly: true },
      games: createDefaultKangurGames(),
    });
    apiGetMock.mockResolvedValue(payload);

    renderHook(() => useKangurGameLibraryPage({ launchableOnly: true }));
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(config.queryKey).toEqual([
      'kangur',
      'game-library-page',
      expect.objectContaining({
        launchableOnly: true,
      }),
    ]);

    await expect(config.queryFn()).resolves.toEqual(payload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/game-library-page', {
      params: expect.objectContaining({
        launchableOnly: true,
      }),
    });
  });
});

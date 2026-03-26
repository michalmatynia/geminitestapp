import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { listKangurGamesMock, captureExceptionMock } = vi.hoisted(() => ({
  listKangurGamesMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository', () => ({
  listKangurGames: listKangurGamesMock,
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { getKangurGameLibraryPageHandler } from './handler';

const createRequestContext = (query?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-game-library-page-1',
    traceId: 'trace-kangur-game-library-page-1',
    correlationId: 'corr-kangur-game-library-page-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('kangur game library page handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listKangurGamesMock.mockResolvedValue(createDefaultKangurGames());
  });

  it('returns a consolidated page payload filtered by query params', async () => {
    const response = await getKangurGameLibraryPageHandler(
      new NextRequest('http://localhost/api/kangur/game-library-page?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listKangurGamesMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600'
    );

    const payload = await response.json();

    expect(payload.overview.subjectGroups.map((group: { subject: { id: string } }) => group.subject.id)).toEqual([
      'maths',
    ]);
    expect(payload.overview.metrics.visibleGameCount).toBeGreaterThan(0);
    expect(payload.catalogFacets.gameCount).toBeGreaterThan(payload.overview.metrics.visibleGameCount);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures handler context when loading the page payload fails', async () => {
    const error = new Error('mongo unavailable');
    listKangurGamesMock.mockRejectedValueOnce(error);

    await expect(
      getKangurGameLibraryPageHandler(
        new NextRequest(
          'http://localhost/api/kangur/game-library-page?subject=maths&launchableOnly=true'
        ),
        createRequestContext({
          subject: 'maths',
          launchableOnly: true,
        })
      )
    ).rejects.toThrow('mongo unavailable');

    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        service: 'kangur.game-library-page-handler',
        action: 'getPageData',
        provider: 'composite',
        subject: 'maths',
        launchableOnly: true,
      })
    );
  });
});

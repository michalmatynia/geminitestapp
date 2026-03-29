import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { listKangurGamesMock, captureExceptionMock } = vi.hoisted(() => ({
  listKangurGamesMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

const { readOptionalServerAuthSessionMock } = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository', () => ({
  listKangurGames: listKangurGamesMock,
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
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
    readOptionalServerAuthSessionMock.mockResolvedValue({
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'admin-1',
        isElevated: true,
        name: 'Super Admin',
        role: 'super_admin',
      },
    });
    listKangurGamesMock.mockResolvedValue(createDefaultKangurGames());
  });

  it('returns a consolidated page payload filtered by query params', async () => {
    const response = await getKangurGameLibraryPageHandler(
      new NextRequest('http://localhost/api/kangur/game-library-page?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listKangurGamesMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');

    const payload = await response.json();

    expect(payload.overview.subjectGroups.map((group: { subject: { id: string } }) => group.subject.id)).toEqual([
      'maths',
    ]);
    expect(payload.overview.metrics.visibleGameCount).toBeGreaterThan(0);
    expect(payload.catalogFacets.gameCount).toBeGreaterThan(payload.overview.metrics.visibleGameCount);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('supports deep-link filtering to a single game id', async () => {
    const response = await getKangurGameLibraryPageHandler(
      new NextRequest(
        'http://localhost/api/kangur/game-library-page?gameId=division_groups'
      ),
      createRequestContext({ gameId: 'division_groups' })
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload.overview.subjectGroups).toHaveLength(1);
    expect(
      payload.overview.subjectGroups.flatMap((group: { entries: { game: { id: string } }[] }) =>
        group.entries.map((entry) => entry.game.id)
      )
    ).toEqual(['division_groups']);
  });

  it('returns not found for non-super-admin sessions and skips loading games', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValueOnce({
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'admin-1',
        isElevated: true,
        name: 'Admin',
        role: 'admin',
      },
    });

    const response = await getKangurGameLibraryPageHandler(
      new NextRequest('http://localhost/api/kangur/game-library-page'),
      createRequestContext()
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ error: 'Not Found' });
    expect(listKangurGamesMock).not.toHaveBeenCalled();
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

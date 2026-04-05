import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { listKangurDuelLeaderboardMock, logKangurServerEventMock } = vi.hoisted(() => ({
  listKangurDuelLeaderboardMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/duels/server', () => ({
  listKangurDuelLeaderboard: listKangurDuelLeaderboardMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurDuelLeaderboardHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-duels-leaderboard-1',
    traceId: 'trace-duels-leaderboard-1',
    correlationId: 'corr-duels-leaderboard-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createGetRequest = (url: string): NextRequest =>
  new NextRequest(url, {
    method: 'GET',
  });

describe('kangur duels leaderboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns leaderboard entries with query parameters', async () => {
    listKangurDuelLeaderboardMock.mockResolvedValue({
      entries: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          wins: 2,
          losses: 1,
          ties: 0,
          matches: 3,
          winRate: 0.66,
          lastPlayedAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const response = await getKangurDuelLeaderboardHandler(
      createGetRequest(
        'http://localhost/api/kangur/duels/leaderboard?limit=5&lookbackDays=14'
      ),
      createRequestContext()
    );

    expect(listKangurDuelLeaderboardMock).toHaveBeenCalledWith({
      limit: 5,
      lookbackDays: 14,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.leaderboard',
        statusCode: 200,
        context: expect.objectContaining({
          limit: 5,
          lookbackDays: 14,
          entries: 1,
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ entries: expect.any(Array) })
    );
  });
});

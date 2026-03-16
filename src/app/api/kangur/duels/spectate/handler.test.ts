import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getKangurDuelSpectatorStateMock, logKangurServerEventMock } = vi.hoisted(() => ({
  getKangurDuelSpectatorStateMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/duels/server', () => ({
  getKangurDuelSpectatorState: getKangurDuelSpectatorStateMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurDuelSpectateHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-duels-spectate-1',
    traceId: 'trace-duels-spectate-1',
    correlationId: 'corr-duels-spectate-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createGetRequest = (url: string): NextRequest =>
  new NextRequest(url, {
    method: 'GET',
  });

describe('kangur duels spectate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns spectator state when sessionId is provided', async () => {
    getKangurDuelSpectatorStateMock.mockResolvedValue({
      session: {
        id: 'duel-1',
        mode: 'challenge',
        visibility: 'public',
        status: 'in_progress',
        createdAt: '2026-03-16T10:00:00.000Z',
        updatedAt: '2026-03-16T12:00:00.000Z',
        questionCount: 3,
        timePerQuestionSec: 20,
        currentQuestionIndex: 1,
        questions: [],
        players: [
          {
            learnerId: 'learner-1',
            displayName: 'Ada',
            status: 'playing',
            score: 2,
            joinedAt: '2026-03-16T10:00:00.000Z',
            lastAnswerAt: null,
            lastAnswerQuestionId: null,
            lastAnswerCorrect: null,
          },
        ],
        spectatorCount: 1,
      },
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const response = await getKangurDuelSpectateHandler(
      createGetRequest('http://localhost/api/kangur/duels/spectate?sessionId=duel-1'),
      createRequestContext()
    );

    expect(getKangurDuelSpectatorStateMock).toHaveBeenCalledWith('duel-1', {
      spectatorId: null,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.spectate',
        statusCode: 200,
        context: expect.objectContaining({
          sessionId: 'duel-1',
        }),
      })
    );
    expect(response.status).toBe(200);
  });

  it('rejects when sessionId is missing', async () => {
    await expect(
      getKangurDuelSpectateHandler(
        createGetRequest('http://localhost/api/kangur/duels/spectate'),
        createRequestContext()
      )
    ).rejects.toThrow('Invalid query parameters');
  });
});

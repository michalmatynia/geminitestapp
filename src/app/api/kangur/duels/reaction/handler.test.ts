import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  sendKangurDuelReactionMock,
  resolveKangurActorMock,
  requireActiveLearnerMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  sendKangurDuelReactionMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  requireActiveLearnerMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/duels/server', () => ({
  sendKangurDuelReaction: sendKangurDuelReactionMock,
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: requireActiveLearnerMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { postKangurDuelReactionHandler } from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-duels-reaction-1',
    traceId: 'trace-duels-reaction-1',
    correlationId: 'corr-duels-reaction-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

const createPostRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/kangur/duels/reaction', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('kangur duels reaction handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      actorType: 'learner',
    });
    requireActiveLearnerMock.mockReturnValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: null,
      aiTutor: null,
      createdAt: '2026-03-16T10:00:00.000Z',
      updatedAt: '2026-03-16T10:00:00.000Z',
    });
  });

  it('creates a duel reaction for the active learner', async () => {
    sendKangurDuelReactionMock.mockResolvedValue({
      reaction: {
        id: 'reaction-1',
        learnerId: 'learner-1',
        displayName: 'Ada',
        type: 'gg',
        createdAt: '2026-03-16T12:00:00.000Z',
      },
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    const response = await postKangurDuelReactionHandler(
      createPostRequest({ sessionId: 'duel-1', type: 'gg' }),
      createRequestContext({ sessionId: 'duel-1', type: 'gg' })
    );

    expect(sendKangurDuelReactionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'learner-1' }),
      { sessionId: 'duel-1', type: 'gg' }
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.duels.reaction',
        statusCode: 201,
        context: expect.objectContaining({
          sessionId: 'duel-1',
          type: 'gg',
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        reaction: expect.objectContaining({ id: 'reaction-1', type: 'gg' }),
      })
    );
  });
});

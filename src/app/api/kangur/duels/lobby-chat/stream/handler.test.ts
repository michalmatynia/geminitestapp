import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, forbiddenError } from '@/shared/errors/app-error';

const { resolveKangurActorMock, requireActiveLearnerMock } = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  requireActiveLearnerMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: requireActiveLearnerMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-duels-lobby-chat-stream-1',
    traceId: 'trace-duels-lobby-chat-stream-1',
    correlationId: 'corr-duels-lobby-chat-stream-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur duels lobby chat stream handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-learner actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      ownerUserId: 'parent-1',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: { id: 'learner-1' },
      learners: [{ id: 'learner-1' }],
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/duels/lobby-chat/stream'),
        createRequestContext()
      )
    ).rejects.toMatchObject(forbiddenError('Only learner accounts can access lobby chat.'));
  });

  it('rejects unauthenticated actors', async () => {
    resolveKangurActorMock.mockRejectedValueOnce(authError('Authentication required.'));

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/kangur/duels/lobby-chat/stream'),
        createRequestContext()
      )
    ).rejects.toThrow('Authentication required.');
  });
});

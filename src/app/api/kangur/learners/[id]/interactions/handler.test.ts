import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';

const {
  resolveKangurActorMock,
  getKangurLearnerByIdMock,
  listKangurLearnerInteractionsMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  getKangurLearnerByIdMock: vi.fn(),
  listKangurLearnerInteractionsMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  getKangurLearnerById: getKangurLearnerByIdMock,
  listKangurLearnerInteractions: listKangurLearnerInteractionsMock,
}));

import { getKangurLearnerInteractionsHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-learner-interactions',
    traceId: 'trace-kangur-learner-interactions',
    correlationId: 'corr-kangur-learner-interactions',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('getKangurLearnerInteractionsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });
    getKangurLearnerByIdMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
    });
  });

  it('returns interaction history for the learner', async () => {
    listKangurLearnerInteractionsMock.mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 20,
    });

    const response = await getKangurLearnerInteractionsHandler(
      new NextRequest(
        'http://localhost/api/kangur/learners/learner-1/interactions?limit=10&offset=20'
      ),
      createRequestContext(),
      { id: 'learner-1' }
    );

    expect(listKangurLearnerInteractionsMock).toHaveBeenCalledWith({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
      limit: 10,
      offset: 20,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [],
      total: 0,
      limit: 10,
      offset: 20,
    });
  });

  it('rejects non-parent actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      ownerUserId: 'parent-1',
      actorId: 'learner-1',
      actorType: 'learner',
      canManageLearners: false,
      role: 'user',
    });

    await expect(
      getKangurLearnerInteractionsHandler(
        new NextRequest('http://localhost/api/kangur/learners/learner-1/interactions'),
        createRequestContext(),
        { id: 'learner-1' }
      )
    ).rejects.toMatchObject(
      forbiddenError('Only parent accounts can manage learners.')
    );
  });

  it('rejects access when learner does not belong to parent', async () => {
    getKangurLearnerByIdMock.mockResolvedValueOnce({
      id: 'learner-1',
      ownerUserId: 'parent-2',
    });

    await expect(
      getKangurLearnerInteractionsHandler(
        new NextRequest('http://localhost/api/kangur/learners/learner-1/interactions'),
        createRequestContext(),
        { id: 'learner-1' }
      )
    ).rejects.toMatchObject(
      forbiddenError('This learner does not belong to the current parent account.', {
        learnerId: 'learner-1',
      })
    );
  });
});

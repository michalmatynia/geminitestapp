import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { createKangurLearnerMock, resolveKangurActorMock, logKangurServerEventMock } =
  vi.hoisted(() => ({
    createKangurLearnerMock: vi.fn(),
    resolveKangurActorMock: vi.fn(),
    logKangurServerEventMock: vi.fn(),
  }));

vi.mock('@/features/kangur/server', () => ({
  createKangurLearner: createKangurLearnerMock,
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurLearnersHandler, postKangurLearnersHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-learners-1',
    traceId: 'trace-kangur-learners-1',
    correlationId: 'corr-kangur-learners-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur learners handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      canManageLearners: true,
      learners: [
        {
          id: 'learner-1',
          ownerUserId: 'parent-1',
          displayName: 'Ada',
          loginName: 'ada-child',
          status: 'active',
          legacyUserKey: null,
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
        },
      ],
    });
  });

  it('lists learners for the current parent account', async () => {
    const response = await getKangurLearnersHandler(
      new NextRequest('http://localhost/api/kangur/learners'),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'learner-1',
        loginName: 'ada-child',
      }),
    ]);
  });

  it('creates a learner under the current parent account', async () => {
    createKangurLearnerMock.mockResolvedValue({
      id: 'learner-2',
      ownerUserId: 'parent-1',
      displayName: 'Ben',
      loginName: 'ben-child',
      status: 'active',
      legacyUserKey: null,
      createdAt: '2026-03-06T11:00:00.000Z',
      updatedAt: '2026-03-06T11:00:00.000Z',
    });

    const response = await postKangurLearnersHandler(
      new NextRequest('http://localhost/api/kangur/learners', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Ben',
          loginName: 'ben-child',
          password: 'secret123',
        }),
      }),
      createRequestContext()
    );

    expect(createKangurLearnerMock).toHaveBeenCalledWith({
      ownerUserId: 'parent-1',
      learner: {
        displayName: 'Ben',
        loginName: 'ben-child',
        password: 'secret123',
      },
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.learners.create',
        statusCode: 201,
        context: expect.objectContaining({
          learnerId: 'learner-2',
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'learner-2',
        displayName: 'Ben',
      })
    );
  });
});

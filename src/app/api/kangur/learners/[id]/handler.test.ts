import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getKangurLearnerByIdMock,
  resolveKangurActorMock,
  updateKangurLearnerMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  getKangurLearnerByIdMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  updateKangurLearnerMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurLearnerById: getKangurLearnerByIdMock,
  resolveKangurActor: resolveKangurActorMock,
  updateKangurLearner: updateKangurLearnerMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { patchKangurLearnerHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-learner-1',
    traceId: 'trace-kangur-learner-1',
    correlationId: 'corr-kangur-learner-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createPatchRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/learners/learner-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur learner [id] handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      canManageLearners: true,
    });
    getKangurLearnerByIdMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Michal',
      loginName: 'mmatynia',
      status: 'active',
      legacyUserKey: 'mmatynia@gmail.com',
      createdAt: '2026-03-06T13:50:38.968Z',
      updatedAt: '2026-03-06T13:50:38.968Z',
    });
  });

  it('updates an owned learner profile for the current parent account', async () => {
    updateKangurLearnerMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Michal',
      loginName: 'mmatynia',
      status: 'active',
      legacyUserKey: 'mmatynia@gmail.com',
      createdAt: '2026-03-06T13:50:38.968Z',
      updatedAt: '2026-03-06T14:13:48.034Z',
    });

    const response = await patchKangurLearnerHandler(
      createPatchRequest(
        JSON.stringify({
          password: 'KangurParentReset2026',
        })
      ),
      createRequestContext(),
      { id: 'learner-1' }
    );

    expect(updateKangurLearnerMock).toHaveBeenCalledWith('learner-1', {
      password: 'KangurParentReset2026',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.learners.update',
        statusCode: 200,
        context: expect.objectContaining({
          learnerId: 'learner-1',
          updatedFields: ['password'],
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'learner-1',
        loginName: 'mmatynia',
      })
    );
  });

  it('rejects updates for a learner owned by another parent account', async () => {
    getKangurLearnerByIdMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'other-parent',
      displayName: 'Michal',
      loginName: 'mmatynia',
      status: 'active',
      legacyUserKey: 'mmatynia@gmail.com',
      createdAt: '2026-03-06T13:50:38.968Z',
      updatedAt: '2026-03-06T13:50:38.968Z',
    });

    await expect(
      patchKangurLearnerHandler(
        createPatchRequest(
          JSON.stringify({
            password: 'KangurParentReset2026',
          })
        ),
        createRequestContext(),
        { id: 'learner-1' }
      )
    ).rejects.toThrow('This learner does not belong to the current parent account.');
  });

  it('lets a learner update their own avatar', async () => {
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      canManageLearners: false,
      actorType: 'learner',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Michal',
        loginName: 'mmatynia',
        status: 'active',
        legacyUserKey: 'mmatynia@gmail.com',
        createdAt: '2026-03-06T13:50:38.968Z',
        updatedAt: '2026-03-06T13:50:38.968Z',
      },
    });
    updateKangurLearnerMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Michal',
      loginName: 'mmatynia',
      status: 'active',
      legacyUserKey: 'mmatynia@gmail.com',
      avatarId: 'star-fox',
      createdAt: '2026-03-06T13:50:38.968Z',
      updatedAt: '2026-03-06T14:13:48.034Z',
    });

    const response = await patchKangurLearnerHandler(
      createPatchRequest(
        JSON.stringify({
          avatarId: 'star-fox',
        })
      ),
      createRequestContext(),
      { id: 'learner-1' }
    );

    expect(updateKangurLearnerMock).toHaveBeenCalledWith('learner-1', {
      avatarId: 'star-fox',
    });
    expect(response.status).toBe(200);
  });
});

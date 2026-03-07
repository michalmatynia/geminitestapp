import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurProgressRepositoryMock,
  getProgressMock,
  logKangurServerEventMock,
  resolveKangurActorMock,
  saveProgressMock,
} = vi.hoisted(() => ({
  getKangurProgressRepositoryMock: vi.fn(),
  getProgressMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  saveProgressMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurProgressHandler, patchKangurProgressHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-progress-1',
    traceId: 'trace-kangur-progress-1',
    correlationId: 'corr-kangur-progress-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createProgress = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => ({
  ...createDefaultKangurProgressState(),
  ...overrides,
});

const createPatchRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/progress', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur progress handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
      saveProgress: saveProgressMock,
    });
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
  });

  it('loads authenticated learner progress by normalized session email', async () => {
    const progress = createProgress({
      totalXp: 180,
      gamesPlayed: 7,
      badges: ['first_game'],
    });
    getProgressMock.mockResolvedValueOnce(createDefaultKangurProgressState());
    getProgressMock.mockResolvedValue(progress);

    const response = await getKangurProgressHandler(
      new NextRequest('http://localhost/api/kangur/progress'),
      createRequestContext()
    );

    expect(getProgressMock).toHaveBeenNthCalledWith(1, 'learner-1');
    expect(getProgressMock).toHaveBeenNthCalledWith(2, 'ada@example.com');
    expect(saveProgressMock).toHaveBeenCalledWith('learner-1', progress);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(progress);
  });

  it('saves validated progress for the authenticated learner', async () => {
    const progress = createProgress({
      totalXp: 320,
      gamesPlayed: 11,
      perfectGames: 3,
      operationsPlayed: ['addition', 'multiplication'],
    });
    saveProgressMock.mockResolvedValue(progress);

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress)),
      createRequestContext()
    );

    expect(saveProgressMock).toHaveBeenCalledWith('learner-1', progress);
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.progress.update',
        statusCode: 200,
        context: expect.objectContaining({
          totalXp: 320,
          gamesPlayed: 11,
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(progress);
  });

  it('rejects anonymous progress reads', async () => {
    resolveKangurActorMock.mockRejectedValue(new Error('Authentication required.'));

    await expect(
      getKangurProgressHandler(
        new NextRequest('http://localhost/api/kangur/progress'),
        createRequestContext()
      )
    ).rejects.toThrow('Authentication required.');
  });

  it('throws on invalid json payload', async () => {
    await expect(
      patchKangurProgressHandler(createPatchRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });
});

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { authMock, getKangurProgressRepositoryMock, getProgressMock, saveProgressMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    getKangurProgressRepositoryMock: vi.fn(),
    getProgressMock: vi.fn(),
    saveProgressMock: vi.fn(),
  })
);

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurProgressRepository: getKangurProgressRepositoryMock,
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

const createProgress = (overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}) => ({
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
  });

  it('loads authenticated learner progress by normalized session email', async () => {
    const progress = createProgress({
      totalXp: 180,
      gamesPlayed: 7,
      badges: ['first_game'],
    });
    authMock.mockResolvedValue({
      user: {
        email: 'Ada@example.com',
      },
    });
    getProgressMock.mockResolvedValue(progress);

    const response = await getKangurProgressHandler(
      new NextRequest('http://localhost/api/kangur/progress'),
      createRequestContext()
    );

    expect(getProgressMock).toHaveBeenCalledWith('ada@example.com');
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
    authMock.mockResolvedValue({
      user: {
        id: 'learner-1',
      },
    });
    saveProgressMock.mockResolvedValue(progress);

    const response = await patchKangurProgressHandler(
      createPatchRequest(JSON.stringify(progress)),
      createRequestContext()
    );

    expect(saveProgressMock).toHaveBeenCalledWith('learner-1', progress);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(progress);
  });

  it('rejects anonymous progress reads', async () => {
    authMock.mockResolvedValue(null);

    await expect(
      getKangurProgressHandler(
        new NextRequest('http://localhost/api/kangur/progress'),
        createRequestContext()
      )
    ).rejects.toThrow('Authentication required.');
  });

  it('throws on invalid json payload', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'learner-1',
      },
    });

    await expect(
      patchKangurProgressHandler(createPatchRequest('{invalid-json'), createRequestContext())
    ).rejects.toThrow('Invalid JSON payload.');
  });
});

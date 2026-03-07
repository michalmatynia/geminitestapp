import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { resolveKangurActorMock, toKangurAuthUserMock, logKangurServerEventMock } = vi.hoisted(
  () => ({
    resolveKangurActorMock: vi.fn(),
    toKangurAuthUserMock: vi.fn(),
    logKangurServerEventMock: vi.fn(),
  })
);

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  toKangurAuthUser: toKangurAuthUserMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurAuthMeHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-auth-me-1',
    traceId: 'trace-kangur-auth-me-1',
    correlationId: 'corr-kangur-auth-me-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur auth me handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the mapped Kangur auth user for the current actor', async () => {
    resolveKangurActorMock.mockResolvedValue({ actorType: 'parent' });
    toKangurAuthUserMock.mockReturnValue({
      id: 'parent-1',
      full_name: 'Ada',
      email: 'ada@example.com',
      role: 'user',
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId: 'parent-1',
      activeLearner: null,
      learners: [],
    });

    const response = await getKangurAuthMeHandler(
      new NextRequest('http://localhost/api/kangur/auth/me'),
      createRequestContext()
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(toKangurAuthUserMock).toHaveBeenCalledWith({ actorType: 'parent' });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.auth.me',
        statusCode: 200,
        context: expect.objectContaining({
          actorType: 'parent',
          learnerCount: 0,
          hasActiveLearner: false,
        }),
      })
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'parent-1',
        actorType: 'parent',
      })
    );
  });
});

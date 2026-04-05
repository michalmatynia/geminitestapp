import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { findAuthUserByIdMock, verifyKangurLearnerPasswordMock, logActivityMock, logKangurServerEventMock } =
  vi.hoisted(() => ({
    findAuthUserByIdMock: vi.fn(),
    verifyKangurLearnerPasswordMock: vi.fn(),
    logActivityMock: vi.fn(),
    logKangurServerEventMock: vi.fn(),
  }));

vi.mock('@/features/auth/server', () => ({
  findAuthUserById: findAuthUserByIdMock,
}));

vi.mock('@/features/kangur/server', () => ({
  verifyKangurLearnerPassword: verifyKangurLearnerPasswordMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: logActivityMock,
}));

import { postKangurLearnerSignInHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-learner-signin-1',
    traceId: 'trace-kangur-learner-signin-1',
    correlationId: 'corr-kangur-learner-signin-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur learner sign-in handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logActivityMock.mockResolvedValue(undefined);
  });

  it('sets a learner session cookie for valid student credentials', async () => {
    verifyKangurLearnerPasswordMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada',
      loginName: 'ada-child',
      status: 'active',
      legacyUserKey: null,
      createdAt: '2026-03-06T10:00:00.000Z',
      updatedAt: '2026-03-06T10:00:00.000Z',
    });
    findAuthUserByIdMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent',
    });

    const response = await postKangurLearnerSignInHandler(
      new NextRequest('http://localhost/api/kangur/auth/learner-signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          loginName: 'ada-child',
          password: 'secret123',
        }),
      }),
      createRequestContext()
    );

    expect(verifyKangurLearnerPasswordMock).toHaveBeenCalledWith('ada-child', 'secret123');
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.auth.learnerSignIn.success',
        statusCode: 200,
      })
    );
    expect(logActivityMock).toHaveBeenCalledWith({
      type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
      description: 'Kangur learner signed in: Ada',
      userId: 'parent-1',
      entityId: 'learner-1',
      entityType: 'kangur_learner',
      metadata: {
        surface: 'kangur',
        actorType: 'learner',
        learnerId: 'learner-1',
        learnerDisplayName: 'Ada',
        loginMethod: 'password',
      },
    });
    expect(response.headers.get('set-cookie')).toContain('kangur.learner-session=');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      learnerId: 'learner-1',
      ownerEmail: 'parent@example.com',
    });
  });
});

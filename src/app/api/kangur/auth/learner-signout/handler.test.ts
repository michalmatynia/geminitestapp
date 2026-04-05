import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { readKangurLearnerSessionMock, logActivityMock } = vi.hoisted(() => ({
  readKangurLearnerSessionMock: vi.fn(),
  logActivityMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-learner-session', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/services/kangur-learner-session')
  >('@/features/kangur/services/kangur-learner-session');
  return {
    ...actual,
    readKangurLearnerSession: readKangurLearnerSessionMock,
  };
});

vi.mock('@/shared/utils/observability/activity-service', () => ({
  logActivity: logActivityMock,
}));

import { postKangurLearnerSignOutHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-learner-signout-1',
    traceId: 'trace-kangur-learner-signout-1',
    correlationId: 'corr-kangur-learner-signout-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur learner sign-out handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logActivityMock.mockResolvedValue(undefined);
  });

  it('clears the learner cookie and logs the sign-out activity when a session exists', async () => {
    readKangurLearnerSessionMock.mockReturnValue({
      learnerId: 'learner-1',
      ownerUserId: 'parent-1',
      exp: Date.now() + 60_000,
    });

    const response = await postKangurLearnerSignOutHandler(
      new NextRequest('http://localhost/api/kangur/auth/learner-signout', {
        method: 'POST',
      }),
      createRequestContext()
    );

    expect(logActivityMock).toHaveBeenCalledWith({
      type: ActivityTypes.KANGUR.LEARNER_SIGNOUT,
      description: 'Kangur learner signed out.',
      userId: 'parent-1',
      entityId: 'learner-1',
      entityType: 'kangur_learner',
      metadata: {
        surface: 'kangur',
        actorType: 'learner',
        learnerId: 'learner-1',
        ownerUserId: 'parent-1',
      },
    });

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('kangur.learner-session=');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

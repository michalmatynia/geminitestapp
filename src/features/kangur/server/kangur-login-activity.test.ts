import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';

const { getActivityRepositoryMock, listActivityMock } = vi.hoisted(() => ({
  getActivityRepositoryMock: vi.fn(),
  listActivityMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  getActivityRepository: getActivityRepositoryMock,
}));

import { listKangurLoginActivity } from './kangur-login-activity';

describe('listKangurLoginActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
    getActivityRepositoryMock.mockResolvedValue({
      listActivity: listActivityMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('combines Kangur parent logins and current learner sign-ins into a tutor-safe activity snapshot', async () => {
    listActivityMock.mockImplementation(async (filters: { type?: string }) => {
      if (filters.type === ActivityTypes.AUTH.LOGIN) {
        return [
          {
            id: 'auth-1',
            type: ActivityTypes.AUTH.LOGIN,
            description: 'User logged in: parent@example.com',
            userId: 'parent-1',
            entityId: 'parent-1',
            entityType: 'user',
            metadata: {
              surface: 'kangur',
              actorType: 'parent',
              authFlow: 'kangur_parent',
              loginMethod: 'magic_link',
            },
            createdAt: '2026-03-08T10:00:00.000Z',
            updatedAt: '2026-03-08T10:00:00.000Z',
          },
          {
            id: 'auth-2',
            type: ActivityTypes.AUTH.LOGIN,
            description: 'User logged in: parent@example.com',
            userId: 'parent-1',
            entityId: 'parent-1',
            entityType: 'user',
            metadata: {
              surface: 'admin',
              authFlow: 'admin',
              loginMethod: 'password',
            },
            createdAt: '2026-03-08T09:00:00.000Z',
            updatedAt: '2026-03-08T09:00:00.000Z',
          },
        ];
      }

      if (filters.type === ActivityTypes.KANGUR.LEARNER_SIGNIN) {
        return [
          {
            id: 'learner-1',
            type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
            description: 'Kangur learner signed in: Jan',
            userId: 'parent-1',
            entityId: 'learner-1',
            entityType: 'kangur_learner',
            metadata: {
              surface: 'kangur',
              actorType: 'learner',
              learnerId: 'learner-1',
              learnerDisplayName: 'Jan',
              loginMethod: 'password',
            },
            createdAt: '2026-03-08T11:00:00.000Z',
            updatedAt: '2026-03-08T11:00:00.000Z',
          },
          {
            id: 'learner-2',
            type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
            description: 'Kangur learner signed in: Ola',
            userId: 'parent-1',
            entityId: 'learner-2',
            entityType: 'kangur_learner',
            metadata: {
              surface: 'kangur',
              actorType: 'learner',
              learnerId: 'learner-2',
              learnerDisplayName: 'Ola',
              loginMethod: 'password',
            },
            createdAt: '2026-03-08T08:00:00.000Z',
            updatedAt: '2026-03-08T08:00:00.000Z',
          },
        ];
      }

      return [];
    });

    const result = await listKangurLoginActivity({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
      limit: 5,
    });

    expect(result.events).toEqual([
      expect.objectContaining({
        id: 'learner-1',
        actorType: 'learner',
        activityType: 'learner_signin',
        loginMethod: 'password',
      }),
      expect.objectContaining({
        id: 'auth-1',
        actorType: 'parent',
        activityType: 'parent_login',
        loginMethod: 'magic_link',
      }),
    ]);
    expect(result.lastLearnerSignIn).toEqual(
      expect.objectContaining({
        id: 'learner-1',
      })
    );
    expect(result.lastParentLogin).toEqual(
      expect.objectContaining({
        id: 'auth-1',
      })
    );
    expect(result.learnerSignInCount7d).toBe(1);
    expect(result.parentLoginCount7d).toBe(1);
  });
});

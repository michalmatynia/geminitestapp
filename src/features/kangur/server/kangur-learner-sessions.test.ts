import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';

const { getActivityRepositoryMock, listActivityMock, countActivityMock } = vi.hoisted(() => ({
  getActivityRepositoryMock: vi.fn(),
  listActivityMock: vi.fn(),
  countActivityMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  getActivityRepository: getActivityRepositoryMock,
}));

import { listKangurLearnerSessions } from './kangur-learner-sessions';

describe('listKangurLearnerSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivityRepositoryMock.mockResolvedValue({
      listActivity: listActivityMock,
      countActivity: countActivityMock,
    });
  });

  it('pairs learner sign-ins with the nearest later sign-out and keeps open sessions', async () => {
    countActivityMock.mockResolvedValue(3);
    listActivityMock.mockResolvedValue([
      {
        id: 'signin-2',
        type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
        description: 'Kangur learner signed in: Ada',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          surface: 'kangur',
          actorType: 'learner',
          learnerId: 'learner-1',
        },
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
      },
      {
        id: 'signout-1',
        type: ActivityTypes.KANGUR.LEARNER_SIGNOUT,
        description: 'Kangur learner signed out.',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          surface: 'kangur',
          actorType: 'learner',
          learnerId: 'learner-1',
        },
        createdAt: '2026-03-10T11:00:00.000Z',
        updatedAt: '2026-03-10T11:00:00.000Z',
      },
      {
        id: 'signin-1',
        type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
        description: 'Kangur learner signed in: Ada',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          surface: 'kangur',
          actorType: 'learner',
          learnerId: 'learner-1',
        },
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
    ]);

    const result = await listKangurLearnerSessions({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
    });

    expect(result.sessions).toEqual([
      {
        id: 'signin-2',
        startedAt: '2026-03-10T12:00:00.000Z',
        endedAt: null,
        durationSeconds: null,
      },
      {
        id: 'signin-1',
        startedAt: '2026-03-10T10:00:00.000Z',
        endedAt: '2026-03-10T11:00:00.000Z',
        durationSeconds: 3600,
      },
    ]);
    expect(result.totalSessions).toBe(2);
  });
});

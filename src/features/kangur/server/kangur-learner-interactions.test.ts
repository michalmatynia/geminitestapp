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

import { listKangurLearnerInteractions } from './kangur-learner-interactions';

describe('listKangurLearnerInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivityRepositoryMock.mockResolvedValue({
      listActivity: listActivityMock,
      countActivity: countActivityMock,
    });
  });

  it('returns empty history when no interactions exist', async () => {
    listActivityMock.mockResolvedValue([]);
    countActivityMock.mockResolvedValue(0);

    const result = await listKangurLearnerInteractions({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
      limit: 20,
      offset: 0,
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('supports paging through interactions', async () => {
    listActivityMock.mockResolvedValue([
      {
        id: 'activity-1',
        type: ActivityTypes.KANGUR.OPENED_TASK,
        description: 'Otwarte zadanie: Powtórka',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          kind: 'lesson',
        },
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
      },
    ]);
    countActivityMock.mockResolvedValue(5);

    const result = await listKangurLearnerInteractions({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
      limit: 1,
      offset: 2,
    });

    expect(listActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        limit: 1,
        offset: 2,
        types: expect.arrayContaining([
          ActivityTypes.KANGUR.OPENED_TASK,
          ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
          ActivityTypes.KANGUR.LEARNER_SIGNIN,
          ActivityTypes.KANGUR.LEARNER_SIGNOUT,
        ]),
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(5);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(2);
  });
});

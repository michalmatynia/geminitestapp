import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';

const {
  getActivityRepositoryMock,
  listActivityMock,
  countActivityMock,
  listKangurLearnerSessionsMock,
} = vi.hoisted(() => ({
  getActivityRepositoryMock: vi.fn(),
  listActivityMock: vi.fn(),
  countActivityMock: vi.fn(),
  listKangurLearnerSessionsMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  getActivityRepository: getActivityRepositoryMock,
}));

vi.mock('./kangur-learner-sessions', () => ({
  listKangurLearnerSessions: listKangurLearnerSessionsMock,
}));

import { listKangurLearnerInteractions } from './kangur-learner-interactions';

describe('listKangurLearnerInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivityRepositoryMock.mockResolvedValue({
      listActivity: listActivityMock,
      countActivity: countActivityMock,
    });
    listKangurLearnerSessionsMock.mockResolvedValue({
      sessions: [],
      totalSessions: 0,
      nextOffset: null,
      hasMore: false,
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
      {
        id: 'activity-2',
        type: ActivityTypes.KANGUR.OPENED_TASK,
        description: 'Otwarte zadanie: Rozgrzewka',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          kind: 'game',
        },
        createdAt: '2026-03-10T11:00:00.000Z',
        updatedAt: '2026-03-10T11:00:00.000Z',
      },
      {
        id: 'activity-3',
        type: ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
        description: 'Aktywność w panelach lekcji',
        userId: 'parent-1',
        entityId: 'learner-1',
        entityType: 'kangur_learner',
        metadata: {
          lessonKey: 'clock',
        },
        createdAt: '2026-03-10T09:00:00.000Z',
        updatedAt: '2026-03-10T09:00:00.000Z',
      },
    ]);
    countActivityMock.mockResolvedValue(3);
    listKangurLearnerSessionsMock.mockResolvedValue({
      sessions: [
        {
          id: 'signin-1',
          startedAt: '2026-03-10T10:55:00.000Z',
          endedAt: '2026-03-10T11:30:00.000Z',
          durationSeconds: 2100,
        },
        {
          id: 'signin-2',
          startedAt: '2026-03-10T10:00:00.000Z',
          endedAt: '2026-03-10T10:30:00.000Z',
          durationSeconds: 1800,
        },
      ],
      totalSessions: 2,
      nextOffset: null,
      hasMore: false,
    });

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
        limit: 3,
        offset: 0,
        types: expect.arrayContaining([
          ActivityTypes.KANGUR.OPENED_TASK,
          ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
        ]),
      })
    );
    expect(listKangurLearnerSessionsMock).toHaveBeenCalledWith({
      ownerUserId: 'parent-1',
      learnerId: 'learner-1',
      limit: 3,
      offset: 0,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('activity-2');
    expect(result.items[0]?.type).toBe(ActivityTypes.KANGUR.OPENED_TASK);
    expect(result.total).toBe(5);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(2);
  });
});

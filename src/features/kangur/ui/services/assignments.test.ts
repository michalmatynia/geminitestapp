import { describe, expect, it } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

import { buildKangurAssignments } from './assignments';

const progressWithMastery: KangurProgressState = {
  totalXp: 540,
  gamesPlayed: 12,
  perfectGames: 3,
  lessonsCompleted: 7,
  clockPerfect: 1,
  calendarPerfect: 1,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    },
    adding: {
      attempts: 3,
      completions: 3,
      masteryPercent: 67,
      bestScorePercent: 80,
      lastScorePercent: 70,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    },
  },
};

describe('buildKangurAssignments', () => {
  it('prioritizes weakest lessons before generic mixed practice', () => {
    const assignments = buildKangurAssignments(progressWithMastery);

    expect(assignments).toHaveLength(3);
    expect(assignments[0]).toMatchObject({
      id: 'lesson-retry-division',
      priority: 'high',
      action: {
        page: 'Lessons',
        query: {
          focus: 'division',
        },
      },
    });
    expect(assignments[1]).toMatchObject({
      id: 'lesson-retry-adding',
      action: {
        page: 'Lessons',
        query: {
          focus: 'adding',
        },
      },
    });
    expect(assignments[2]).toMatchObject({
      id: 'mixed-practice',
      action: {
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  });

  it('creates a starter assignment when no lesson mastery exists yet', () => {
    const assignments = buildKangurAssignments({
      ...progressWithMastery,
      lessonMastery: {},
      gamesPlayed: 1,
    });

    expect(assignments.map((assignment) => assignment.id)).toEqual([
      'lesson-start',
      'mixed-practice',
    ]);
    expect(assignments[0]).toMatchObject({
      action: {
        page: 'Lessons',
      },
    });
  });
});

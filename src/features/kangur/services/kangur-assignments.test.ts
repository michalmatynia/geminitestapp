import { describe, expect, it } from 'vitest';

import {
  createDefaultKangurProgressState,
  type KangurAssignment,
  type KangurScore,
} from '@/features/kangur/shared/contracts/kangur';

import {
  buildKangurAssignmentDedupeKey,
  buildStoredKangurAssignmentTarget,
  evaluateKangurAssignment,
} from './kangur-assignments';

describe('kangur assignments domain', () => {
  it('captures baseline lesson completions when building a stored target', () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 4,
      completions: 3,
      masteryPercent: 72,
      bestScorePercent: 80,
      lastScorePercent: 70,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    };

    const target = buildStoredKangurAssignmentTarget({
      target: {
        type: 'lesson',
        lessonComponentId: 'division',
        requiredCompletions: 1,
      },
      progress,
    });

    expect(target).toEqual({
      type: 'lesson',
      lessonComponentId: 'division',
      requiredCompletions: 1,
      baselineCompletions: 3,
    });
  });

  it('marks lesson assignments as completed after an extra lesson completion', () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 5,
      completions: 4,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 85,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    };

    const assignment: KangurAssignment = {
      id: 'assignment-1',
      learnerKey: 'ada@example.com',
      title: 'Powtórka dzielenia',
      description: 'Przerób jeszcze jedną sesję dzielenia.',
      priority: 'high',
      archived: false,
      target: {
        type: 'lesson',
        lessonComponentId: 'division',
        requiredCompletions: 1,
        baselineCompletions: 3,
      },
      assignedByName: 'Ada',
      assignedByEmail: 'ada@example.com',
      createdAt: '2026-03-06T11:00:00.000Z',
      updatedAt: '2026-03-06T11:00:00.000Z',
    };

    const snapshot = evaluateKangurAssignment({
      assignment,
      progress,
      scores: [],
    });

    expect(snapshot.progress.status).toBe('completed');
    expect(snapshot.progress.percent).toBe(100);
    expect(snapshot.progress.attemptsCompleted).toBe(1);
    expect(snapshot.progress.completedAt).toBe('2026-03-06T12:00:00.000Z');
  });

  it('tracks practice assignments from matching scores created after assignment time', () => {
    const assignment: KangurAssignment = {
      id: 'assignment-2',
      learnerKey: 'ada@example.com',
      title: 'Praktyka: Dzielenie',
      description: 'Zrób jedną sesję dzielenia i celuj w 80%.',
      priority: 'high',
      archived: false,
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
      assignedByName: 'Ada',
      assignedByEmail: 'ada@example.com',
      createdAt: '2026-03-06T10:00:00.000Z',
      updatedAt: '2026-03-06T10:00:00.000Z',
    };
    const scores: KangurScore[] = [
      {
        id: 'old-score',
        player_name: 'Ada',
        score: 10,
        operation: 'division',
        total_questions: 10,
        correct_answers: 10,
        time_taken: 30,
        created_date: '2026-03-06T09:00:00.000Z',
        created_by: 'ada@example.com',
      },
      {
        id: 'new-score',
        player_name: 'Ada',
        score: 9,
        operation: 'division',
        total_questions: 10,
        correct_answers: 9,
        time_taken: 28,
        created_date: '2026-03-06T11:00:00.000Z',
        created_by: 'ada@example.com',
      },
    ];

    const snapshot = evaluateKangurAssignment({
      assignment,
      progress: createDefaultKangurProgressState(),
      scores,
    });

    expect(snapshot.progress.status).toBe('completed');
    expect(snapshot.progress.attemptsCompleted).toBe(1);
    expect(snapshot.progress.summary).toContain('najlepsza skuteczność 90%');
    expect(buildKangurAssignmentDedupeKey(assignment.target)).toBe('practice:division:1:80');
  });
});

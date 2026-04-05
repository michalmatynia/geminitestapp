import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { type KangurScore } from '@kangur/contracts';
import { describe, expect, it } from 'vitest';

import { buildKangurLearnerProfileSnapshot, buildLessonMasteryInsights } from './profile';

const createProgressWithMastery = () => ({
  ...createDefaultKangurProgressState(),
  badges: ['first_game'],
  gamesPlayed: 12,
  lessonMastery: {
    adding: {
      attempts: 3,
      bestScorePercent: 80,
      completions: 3,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
      lastScorePercent: 70,
      masteryPercent: 67,
    },
    clock: {
      attempts: 4,
      bestScorePercent: 100,
      completions: 4,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
      lastScorePercent: 90,
      masteryPercent: 92,
    },
    division: {
      attempts: 2,
      bestScorePercent: 60,
      completions: 2,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
      lastScorePercent: 40,
      masteryPercent: 45,
    },
  },
  lessonsCompleted: 7,
  operationsPlayed: ['addition', 'division'],
  perfectGames: 3,
  totalXp: 620,
});

const createScore = (overrides: Partial<KangurScore> = {}): KangurScore => ({
  correct_answers: 4,
  created_by: 'user-1',
  created_date: '2026-03-06T12:00:00.000Z',
  id: 'score-1',
  learner_id: 'learner-1',
  operation: 'division',
  owner_user_id: 'user-1',
  player_name: 'Ada Learner',
  score: 4,
  subject: 'maths',
  time_taken: 44,
  total_questions: 10,
  ...overrides,
});

describe('kangur-core profile localization', () => {
  it('localizes lesson mastery titles in English', () => {
    const insights = buildLessonMasteryInsights(createProgressWithMastery(), 3, 'en');

    expect(insights.weakest[0]?.title).toBe('Division');
    expect(insights.strongest[0]?.title).toBe('Clock');
  });

  it('keeps counts while limiting weakest and strongest lesson selections', () => {
    const insights = buildLessonMasteryInsights(createProgressWithMastery(), 1, 'en');

    expect(insights.trackedLessons).toBe(3);
    expect(insights.masteredLessons).toBe(1);
    expect(insights.lessonsNeedingPractice).toBe(2);
    expect(insights.weakest).toEqual([
      expect.objectContaining({
        componentId: 'division',
        title: 'Division',
      }),
    ]);
    expect(insights.strongest).toEqual([
      expect.objectContaining({
        componentId: 'clock',
        title: 'Clock',
      }),
    ]);
  });

  it('localizes learner snapshot labels and recommendations in German', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      dailyGoalGames: 3,
      locale: 'de',
      now: new Date('2026-03-06T15:00:00.000Z'),
      progress: createProgressWithMastery(),
      scores: [createScore()],
    });

    expect(snapshot.level.title).toBe('Zahlenmeister 🔢');
    expect(snapshot.operationPerformance[0]).toMatchObject({
      label: 'Division',
      operation: 'division',
    });
    expect(snapshot.recentSessions[0]?.operationLabel).toBe('Division');
    expect(snapshot.recommendations).toEqual([
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'Lektion öffnen',
        }),
        id: 'focus_weakest_operation',
        title: 'Fokus auf: Division',
      }),
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'Jetzt trainieren',
        }),
        id: 'improve_accuracy',
        title: 'Trefferquote stabilisieren',
      }),
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'Lektion öffnen',
        }),
        id: 'strengthen_lesson_mastery',
        title: 'Lektion wiederholen: Division',
      }),
    ]);
  });

  it('keeps longest streaks while dropping current streak when the latest session is too old', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      dailyGoalGames: 3,
      locale: 'en',
      now: new Date('2026-03-10T15:00:00.000Z'),
      progress: createProgressWithMastery(),
      scores: [
        createScore({
          id: 's1',
          created_date: '2026-03-07T12:00:00.000Z',
        }),
        createScore({
          id: 's2',
          created_date: '2026-03-05T12:00:00.000Z',
        }),
        createScore({
          id: 's3',
          created_date: '2026-03-04T12:00:00.000Z',
        }),
        createScore({
          id: 's4',
          created_date: '2026-03-03T12:00:00.000Z',
        }),
      ],
    });

    expect(snapshot.currentStreakDays).toBe(0);
    expect(snapshot.longestStreakDays).toBe(3);
    expect(snapshot.lastPlayedAt).toBe('2026-03-07T12:00:00.000Z');
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  xp_earned: 24,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

const progress: KangurProgressState = {
  totalXp: 620,
  gamesPlayed: 22,
  perfectGames: 6,
  lessonsCompleted: 9,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
  operationsPlayed: ['addition', 'multiplication', 'division'],
  lessonMastery: {},
};

describe('buildKangurLearnerProfileSnapshot', () => {
  it('summarizes strongest and weakest tracked lessons from mastery data', () => {
    const insights = buildLessonMasteryInsights({
      ...progress,
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
    });

    expect(insights.trackedLessons).toBe(3);
    expect(insights.masteredLessons).toBe(1);
    expect(insights.lessonsNeedingPractice).toBe(2);
    expect(insights.weakest[0]).toMatchObject({
      componentId: 'division',
      masteryPercent: 45,
    });
    expect(insights.strongest[0]).toMatchObject({
      componentId: 'clock',
      masteryPercent: 92,
    });
  });

  it('builds aggregate learner metrics from score history and progress', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress,
      scores: [
        createScore({
          id: 's1',
          operation: 'addition',
          correct_answers: 8,
          created_date: '2026-03-06T12:00:00.000Z',
        }),
        createScore({
          id: 's2',
          operation: 'multiplication',
          correct_answers: 10,
          score: 10,
          created_date: '2026-03-05T12:00:00.000Z',
        }),
        createScore({
          id: 's3',
          operation: 'addition',
          correct_answers: 7,
          score: 7,
          created_date: '2026-03-04T12:00:00.000Z',
        }),
        createScore({
          id: 's4',
          operation: 'division',
          correct_answers: 6,
          score: 6,
          created_date: '2026-03-02T12:00:00.000Z',
        }),
      ],
      dailyGoalGames: 2,
      now: new Date('2026-03-06T15:00:00.000Z'),
    });

    expect(snapshot.totalXp).toBe(620);
    expect(snapshot.level.level).toBe(4);
    expect(snapshot.nextLevel?.level).toBe(5);
    expect(snapshot.levelProgressPercent).toBeGreaterThan(0);
    expect(snapshot.averageAccuracy).toBe(78);
    expect(snapshot.bestAccuracy).toBe(100);
    expect(snapshot.currentStreakDays).toBe(3);
    expect(snapshot.longestStreakDays).toBe(3);
    expect(snapshot.todayGames).toBe(1);
    expect(snapshot.dailyGoalPercent).toBe(50);
    expect(snapshot.todayXpEarned).toBe(24);
    expect(snapshot.weeklyXpEarned).toBe(96);
    expect(snapshot.averageXpPerSession).toBe(28);
    expect(snapshot.unlockedBadges).toBe(8);
    expect(snapshot.unlockedBadgeIds).toEqual(
      expect.arrayContaining([
        'first_game',
        'perfect_10',
        'lesson_hero',
        'clock_master',
        'calendar_keeper',
        'geometry_artist',
        'ten_games',
        'xp_500',
      ])
    );
    expect(snapshot.operationPerformance.map((entry) => entry.operation)).toContain('addition');
    expect(
      snapshot.operationPerformance.find((entry) => entry.operation === 'addition')
    ).toMatchObject({
      attempts: 2,
      averageAccuracy: 75,
      bestScore: 80,
      totalXpEarned: 48,
      averageXpPerSession: 24,
    });
    expect(snapshot.recentSessions[0]?.id).toBe('s1');
    expect(snapshot.recentSessions[0]?.xpEarned).toBe(24);
    expect(snapshot.weeklyActivity).toHaveLength(7);
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
    expect(snapshot.recommendations.map((entry) => entry.id)).toContain('daily_goal');
    expect(snapshot.recommendations.find((entry) => entry.id === 'daily_goal')).toMatchObject({
      description: expect.stringContaining('Dzis masz juz +24 XP.'),
      action: {
        label: 'Zagraj teraz',
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  });

  it('returns zeroed runtime values when no scores are present', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress,
      scores: [],
      dailyGoalGames: 3,
      now: new Date('2026-03-06T15:00:00.000Z'),
    });

    expect(snapshot.averageAccuracy).toBe(0);
    expect(snapshot.bestAccuracy).toBe(0);
    expect(snapshot.currentStreakDays).toBe(0);
    expect(snapshot.longestStreakDays).toBe(0);
    expect(snapshot.lastPlayedAt).toBeNull();
    expect(snapshot.todayGames).toBe(0);
    expect(snapshot.todayXpEarned).toBe(0);
    expect(snapshot.weeklyXpEarned).toBe(0);
    expect(snapshot.averageXpPerSession).toBe(28);
    expect(snapshot.operationPerformance).toEqual([]);
    expect(snapshot.recentSessions).toEqual([]);
    expect(snapshot.weeklyActivity).toHaveLength(7);
    expect(snapshot.recommendations.map((entry) => entry.id)).toContain('daily_goal');
    expect(snapshot.recommendations.map((entry) => entry.id)).toContain('streak_bootstrap');
    expect(snapshot.recommendations.every((entry) => Boolean(entry.action?.label))).toBe(true);
    expect(snapshot.recommendations.every((entry) => typeof entry.action.page === 'string')).toBe(
      true
    );
  });

  it('falls back to progress activity stats for accuracy when score history is empty', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress: {
        ...progress,
        totalCorrectAnswers: 44,
        totalQuestionsAnswered: 50,
        activityStats: {
          'training:clock:hours': {
            sessionsPlayed: 4,
            perfectSessions: 1,
            totalCorrectAnswers: 18,
            totalQuestionsAnswered: 20,
            totalXpEarned: 112,
            bestScorePercent: 100,
            lastScorePercent: 80,
            currentStreak: 2,
            bestStreak: 2,
            lastPlayedAt: '2026-03-08T10:00:00.000Z',
          },
        },
      },
      scores: [],
      dailyGoalGames: 3,
      now: new Date('2026-03-09T15:00:00.000Z'),
    });

    expect(snapshot.averageAccuracy).toBe(88);
    expect(snapshot.bestAccuracy).toBe(100);
    expect(snapshot.lastPlayedAt).toBe('2026-03-08T10:00:00.000Z');
    expect(snapshot.operationPerformance).toEqual([
      expect.objectContaining({
        operation: 'clock',
        averageAccuracy: 90,
        totalXpEarned: 112,
        averageXpPerSession: 28,
      }),
    ]);
  });

  it('derives unlocked badges from current progress even when badge ids were not persisted yet', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress: {
        ...progress,
        badges: ['first_game'],
        totalXp: 620,
        gamesPlayed: 10,
      },
      scores: [],
      dailyGoalGames: 3,
      now: new Date('2026-03-09T15:00:00.000Z'),
    });

    expect(snapshot.unlockedBadgeIds).toEqual(
      expect.arrayContaining(['first_game', 'ten_games', 'xp_500'])
    );
    expect(snapshot.unlockedBadges).toBeGreaterThanOrEqual(3);
  });

  it('surfaces quest badges when daily missions were completed', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress: {
        ...progress,
        badges: ['first_game'],
        dailyQuestsCompleted: 1,
      },
      scores: [],
      dailyGoalGames: 3,
      now: new Date('2026-03-09T15:00:00.000Z'),
    });

    expect(snapshot.unlockedBadgeIds).toEqual(expect.arrayContaining(['quest_starter']));
  });

  it('uses learner-friendly labels for calendar and geometry sessions in recent history', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress,
      scores: [
        createScore({
          id: 'calendar-session',
          operation: 'calendar',
          created_date: '2026-03-06T12:00:00.000Z',
        }),
        createScore({
          id: 'geometry-session',
          operation: 'geometry',
          created_date: '2026-03-05T12:00:00.000Z',
        }),
      ],
      dailyGoalGames: 2,
      now: new Date('2026-03-06T15:00:00.000Z'),
    });

    expect(snapshot.recentSessions[0]).toMatchObject({
      id: 'calendar-session',
      operationLabel: 'Kalendarz',
      operationEmoji: '📅',
      xpEarned: 24,
    });
    expect(snapshot.recentSessions[1]).toMatchObject({
      id: 'geometry-session',
      operationLabel: 'Geometria',
      operationEmoji: '🔷',
      xpEarned: 24,
    });
  });

  it('adds an xp momentum recommendation when the daily game goal is complete but xp is low', () => {
    const snapshot = buildKangurLearnerProfileSnapshot({
      progress: {
        ...progress,
        totalXp: 620,
        gamesPlayed: 22,
        lessonMastery: {},
      },
      scores: [
        createScore({
          id: 's1',
          operation: 'clock',
          correct_answers: 8,
          created_date: '2026-03-06T12:00:00.000Z',
          xp_earned: 5,
        }),
        createScore({
          id: 's2',
          operation: 'clock',
          correct_answers: 9,
          score: 9,
          created_date: '2026-03-06T11:00:00.000Z',
          xp_earned: 5,
        }),
        createScore({
          id: 's3',
          operation: 'clock',
          correct_answers: 8,
          score: 8,
          created_date: '2026-03-06T10:00:00.000Z',
          xp_earned: 5,
        }),
      ],
      dailyGoalGames: 3,
      now: new Date('2026-03-06T15:00:00.000Z'),
    });

    expect(snapshot.todayGames).toBe(3);
    expect(snapshot.todayXpEarned).toBe(15);
    expect(snapshot.averageXpPerSession).toBe(28);
    expect(snapshot.recommendations.map((entry) => entry.id)).toContain('boost_xp_momentum');
    expect(snapshot.recommendations.find((entry) => entry.id === 'boost_xp_momentum')).toMatchObject(
      {
        action: {
          label: 'Uruchom trening',
          page: 'Game',
          query: {
            quickStart: 'operation',
            operation: 'clock',
            difficulty: 'medium',
          },
        },
      }
    );
    expect(
      snapshot.recommendations.find((entry) => entry.id === 'boost_xp_momentum')?.description
    ).toContain('okolo 5 XP na probe');
  });
});

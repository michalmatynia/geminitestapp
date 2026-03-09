import { describe, expect, it } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import {
  buildLessonMasteryUpdate,
  createGameSessionReward,
  getProgressBadges,
  createLessonPracticeReward,
  createLessonCompletionReward,
  createTrainingReward,
  getKangurProgressServerSnapshot,
  mergeProgressStates,
} from './progress';

describe('kangur progress mastery helpers', () => {
  it('reuses a stable server snapshot for sync external store hydration', () => {
    const firstSnapshot = getKangurProgressServerSnapshot();
    const secondSnapshot = getKangurProgressServerSnapshot();

    expect(firstSnapshot).toBe(secondSnapshot);
    expect(firstSnapshot).toEqual(createDefaultKangurProgressState());
  });

  it('builds a lesson mastery entry from a completed lesson attempt', () => {
    const progress = createDefaultKangurProgressState();

    const updated = buildLessonMasteryUpdate(progress, 'clock', 60, '2026-03-06T10:00:00.000Z');

    expect(updated['clock']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 60,
      bestScorePercent: 60,
      lastScorePercent: 60,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
  });

  it('creates a standard lesson practice reward with mastery and lesson completion updates', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'adding', 4, 6);

    expect(reward.xp).toBe(22);
    expect(reward.scorePercent).toBe(67);
    expect(reward.progressUpdates.lessonsCompleted).toBeUndefined();
    expect(reward.progressUpdates.totalCorrectAnswers).toBe(4);
    expect(reward.progressUpdates.totalQuestionsAnswered).toBe(6);
    expect(reward.progressUpdates.currentWinStreak).toBe(1);
    expect(reward.progressUpdates.bestWinStreak).toBe(1);
    expect(reward.progressUpdates.activityStats?.['lesson_practice:adding']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 0,
      totalCorrectAnswers: 4,
      totalQuestionsAnswered: 6,
      bestScorePercent: 67,
      lastScorePercent: 67,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: expect.any(String),
    });
    expect(reward.progressUpdates.lessonMastery?.['adding']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 67,
      bestScorePercent: 67,
      lastScorePercent: 67,
      lastCompletedAt: expect.any(String),
    });
  });

  it('uses the perfect-game reward when lesson practice finishes with a full score', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'division', 7, 7);

    expect(reward.xp).toBe(46);
    expect(reward.scorePercent).toBe(100);
    expect(reward.progressUpdates.lessonMastery?.['division']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 100,
      bestScorePercent: 100,
      lastScorePercent: 100,
      lastCompletedAt: expect.any(String),
    });
  });

  it('falls back to the baseline reward when lesson practice stays below the mastery threshold', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'subtracting', 2, 6);

    expect(reward.xp).toBe(12);
    expect(reward.scorePercent).toBe(33);
    expect(reward.progressUpdates.lessonMastery?.['subtracting']?.masteryPercent).toBe(33);
    expect(reward.progressUpdates.currentWinStreak).toBe(0);
  });

  it('creates a main game reward with operation tracking, streaks, and speed bonus', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createGameSessionReward(progress, {
      operation: 'addition',
      difficulty: 'hard',
      correctAnswers: 9,
      totalQuestions: 10,
      durationSeconds: 48,
    });

    expect(reward.xp).toBe(41);
    expect(reward.scorePercent).toBe(90);
    expect(reward.progressUpdates.gamesPlayed).toBe(1);
    expect(reward.progressUpdates.perfectGames).toBe(0);
    expect(reward.progressUpdates.operationsPlayed).toEqual(['addition']);
    expect(reward.progressUpdates.currentWinStreak).toBe(1);
    expect(reward.progressUpdates.bestWinStreak).toBe(1);
    expect(reward.progressUpdates.activityStats?.['game:addition']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 0,
      totalCorrectAnswers: 9,
      totalQuestionsAnswered: 10,
      bestScorePercent: 90,
      lastScorePercent: 90,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: expect.any(String),
    });
  });

  it('creates a training reward with the dedicated perfect counter', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createTrainingReward(progress, {
      activityKey: 'training:calendar',
      lessonKey: 'calendar',
      correctAnswers: 6,
      totalQuestions: 6,
      strongThresholdPercent: 65,
      perfectCounterKey: 'calendarPerfect',
    });

    expect(reward.xp).toBe(48);
    expect(reward.progressUpdates.calendarPerfect).toBe(1);
    expect(reward.progressUpdates.activityStats?.['training:calendar']?.perfectSessions).toBe(1);
  });

  it('creates a lesson completion reward without counting solved questions', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonCompletionReward(progress, 'clock', 100);

    expect(reward.xp).toBe(52);
    expect(reward.scorePercent).toBe(100);
    expect(reward.progressUpdates.lessonsCompleted).toBe(1);
    expect(reward.progressUpdates.totalQuestionsAnswered).toBe(0);
    expect(reward.progressUpdates.activityStats?.['lesson_completion:clock']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 1,
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
      bestScorePercent: 100,
      lastScorePercent: 100,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: expect.any(String),
    });
  });

  it('exposes badge progress metadata for locked and unlocked badges', () => {
    const badges = getProgressBadges({
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
      totalXp: 620,
      badges: ['first_game'],
    });

    expect(badges.find((badge) => badge.id === 'first_game')).toMatchObject({
      isUnlocked: true,
      summary: '1/1 gra',
    });
    expect(badges.find((badge) => badge.id === 'ten_games')).toMatchObject({
      isUnlocked: false,
      summary: '4/10 gier',
    });
    expect(badges.find((badge) => badge.id === 'xp_500')).toMatchObject({
      isUnlocked: true,
      summary: '500/500 XP',
    });
  });

  it('merges lesson mastery by keeping the latest mastery snapshot and the best score', () => {
    const remote = {
      ...createDefaultKangurProgressState(),
      totalCorrectAnswers: 12,
      totalQuestionsAnswered: 18,
      bestWinStreak: 2,
      activityStats: {
        'lesson_practice:clock': {
          sessionsPlayed: 2,
          perfectSessions: 0,
          totalCorrectAnswers: 12,
          totalQuestionsAnswered: 18,
          bestScorePercent: 80,
          lastScorePercent: 67,
          currentStreak: 1,
          bestStreak: 1,
          lastPlayedAt: '2026-03-05T10:00:00.000Z',
        },
      },
      lessonMastery: {
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 68,
          bestScorePercent: 90,
          lastScorePercent: 70,
          lastCompletedAt: '2026-03-05T10:00:00.000Z',
        },
      },
    };
    const local = {
      ...createDefaultKangurProgressState(),
      totalCorrectAnswers: 15,
      totalQuestionsAnswered: 18,
      currentWinStreak: 3,
      bestWinStreak: 3,
      activityStats: {
        'lesson_practice:clock': {
          sessionsPlayed: 3,
          perfectSessions: 1,
          totalCorrectAnswers: 15,
          totalQuestionsAnswered: 18,
          bestScorePercent: 100,
          lastScorePercent: 100,
          currentStreak: 3,
          bestStreak: 3,
          lastPlayedAt: '2026-03-06T10:00:00.000Z',
        },
      },
      lessonMastery: {
        clock: {
          attempts: 3,
          completions: 3,
          masteryPercent: 82,
          bestScorePercent: 82,
          lastScorePercent: 82,
          lastCompletedAt: '2026-03-06T10:00:00.000Z',
        },
        geometry_shapes: {
          attempts: 1,
          completions: 1,
          masteryPercent: 60,
          bestScorePercent: 60,
          lastScorePercent: 60,
          lastCompletedAt: '2026-03-06T11:00:00.000Z',
        },
      },
    };

    const merged = mergeProgressStates(remote, local);

    expect(merged.lessonMastery['clock']).toEqual({
      attempts: 3,
      completions: 3,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 82,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
    expect(merged.lessonMastery['geometry_shapes']).toEqual(local.lessonMastery['geometry_shapes']);
    expect(merged.totalCorrectAnswers).toBe(15);
    expect(merged.totalQuestionsAnswered).toBe(18);
    expect(merged.bestWinStreak).toBe(3);
    expect(merged.activityStats?.['lesson_practice:clock']).toEqual({
      sessionsPlayed: 3,
      perfectSessions: 1,
      totalCorrectAnswers: 15,
      totalQuestionsAnswered: 18,
      bestScorePercent: 100,
      lastScorePercent: 100,
      currentStreak: 3,
      bestStreak: 3,
      lastPlayedAt: '2026-03-06T10:00:00.000Z',
    });
  });
});

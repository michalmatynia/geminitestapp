/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addXpMock,
  claimCurrentKangurDailyQuestRewardMock,
  createGameSessionRewardMock,
  getCurrentKangurDailyQuestMock,
  getNextLockedBadgeMock,
  getProgressSubjectMock,
  loadProgressMock,
} = vi.hoisted(() => ({
  addXpMock: vi.fn(),
  claimCurrentKangurDailyQuestRewardMock: vi.fn(),
  createGameSessionRewardMock: vi.fn(),
  getCurrentKangurDailyQuestMock: vi.fn(),
  getNextLockedBadgeMock: vi.fn(),
  getProgressSubjectMock: vi.fn(),
  loadProgressMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  claimCurrentKangurDailyQuestReward: claimCurrentKangurDailyQuestRewardMock,
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  addXp: addXpMock,
  createGameSessionReward: createGameSessionRewardMock,
  getNextLockedBadge: getNextLockedBadgeMock,
  getProgressSubject: getProgressSubjectMock,
  loadProgress: loadProgressMock,
}));

import { buildKangurCompletedGameOutcome } from './KangurGameRuntimeContext.helpers';

describe('buildKangurCompletedGameOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty rewards when reward awarding is disabled', () => {
    const result = buildKangurCompletedGameOutcome({
      activeSessionRecommendation: null,
      difficulty: 'medium',
      nextScore: 6,
      operation: 'addition',
      taken: 42,
      totalQuestions: 10,
      allowRewards: false,
    });

    expect(result.awardedXp).toBe(0);
    expect(result.awardedBadges).toEqual([]);
    expect(result.awardedBreakdown).toEqual([]);
    expect(result.dailyQuestToastHint).toBeNull();
    expect(result.nextBadgeToastHint).toBeNull();
    expect(result.recommendationToastHint).toBeNull();
  });

  it('localizes the daily-quest reward breakdown label when the quest bonus is awarded', () => {
    const storedProgress = {
      totalXp: 420,
      gamesPlayed: 8,
      perfectGames: 2,
      lessonsCompleted: 3,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: ['first_game'],
      operationsPlayed: ['division'],
      lessonMastery: {},
      totalCorrectAnswers: 32,
      totalQuestionsAnswered: 40,
      currentWinStreak: 2,
      bestWinStreak: 4,
      dailyQuestsCompleted: 0,
      activityStats: {},
      openedTasks: [],
      lessonPanelProgress: {},
    };

    loadProgressMock.mockReturnValue(storedProgress);
    getProgressSubjectMock.mockReturnValue('maths');
    createGameSessionRewardMock.mockReturnValue({
      xp: 30,
      progressUpdates: { gamesPlayed: 1 },
      breakdown: [{ kind: 'base', label: 'Round completed', xp: 30 }],
    });
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: { title: 'Daily mission' },
      progress: {
        status: 'in_progress',
        summary: '0/1 rounds today',
      },
    });
    addXpMock
      .mockReturnValueOnce({
        updated: {
          ...storedProgress,
          gamesPlayed: 9,
        },
        newBadges: [],
      })
      .mockReturnValueOnce({
        updated: {
          ...storedProgress,
          gamesPlayed: 9,
          dailyQuestsCompleted: 1,
        },
        newBadges: [],
      });
    claimCurrentKangurDailyQuestRewardMock.mockReturnValue({
      xpAwarded: 55,
      quest: {
        assignment: { title: 'Daily mission' },
        progress: {
          status: 'completed',
          summary: '1/1 rounds today',
        },
      },
    });
    getNextLockedBadgeMock.mockReturnValue(null);

    const result = buildKangurCompletedGameOutcome({
      activeSessionRecommendation: null,
      difficulty: 'medium',
      nextScore: 8,
      operation: 'division',
      taken: 38,
      totalQuestions: 10,
      progressTranslate: (key) => {
        switch (key) {
          case 'rewardBreakdown.dailyQuest':
            return 'Daily mission';
          default:
            return key;
        }
      },
    });

    expect(result.awardedXp).toBe(85);
    expect(result.awardedBreakdown).toEqual([
      { kind: 'base', label: 'Round completed', xp: 30 },
      { kind: 'daily_quest', label: 'Daily mission', xp: 55 },
    ]);
    expect(result.dailyQuestToastHint).toEqual({
      title: 'Daily mission',
      summary: '1/1 rounds today',
      xpAwarded: 55,
    });
  });
});

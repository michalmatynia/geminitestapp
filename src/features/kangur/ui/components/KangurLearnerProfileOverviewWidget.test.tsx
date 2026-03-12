/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';
import {
  claimCurrentKangurDailyQuestReward,
  getCurrentKangurDailyQuest,
} from '@/features/kangur/ui/services/daily-quests';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileOverviewWidget } from './KangurLearnerProfileOverviewWidget';

const progressWithWeakLesson: KangurProgressState = {
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
  totalCorrectAnswers: 48,
  totalQuestionsAnswered: 60,
  currentWinStreak: 2,
  bestWinStreak: 2,
  activityStats: {},
};

const progressAfterRecovery: KangurProgressState = {
  ...progressWithWeakLesson,
  gamesPlayed: 13,
  lessonMastery: {
    ...progressWithWeakLesson.lessonMastery,
    division: {
      ...progressWithWeakLesson.lessonMastery.division!,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-10T11:00:00.000Z',
    },
  },
};

const buildRuntimeValue = (overrides?: Record<string, unknown>) => ({
  basePath: '/kangur',
  user: null,
  progress: {
    totalXp: 480,
    gamesPlayed: 4,
    perfectGames: 1,
    lessonsCompleted: 2,
    clockPerfect: 1,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: ['first_game'],
    operationsPlayed: ['addition', 'clock'],
    lessonMastery: {},
    totalCorrectAnswers: 32,
    totalQuestionsAnswered: 40,
    currentWinStreak: 2,
    bestWinStreak: 2,
    activityStats: {},
  },
  scores: [],
  isLoadingScores: false,
  scoresError: null,
  snapshot: {
    totalXp: 480,
    gamesPlayed: 4,
    lessonsCompleted: 2,
    perfectGames: 1,
    totalBadges: 11,
    unlockedBadges: 2,
    unlockedBadgeIds: ['first_game', 'perfect_10'],
    level: { level: 4, minXp: 250, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
    nextLevel: { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
    levelProgressPercent: 92,
    averageAccuracy: 80,
    bestAccuracy: 100,
    currentStreakDays: 2,
    longestStreakDays: 3,
    lastPlayedAt: '2026-03-08T10:00:00.000Z',
    dailyGoalGames: 3,
    todayGames: 1,
    dailyGoalPercent: 33,
    todayXpEarned: 28,
    weeklyXpEarned: 112,
    averageXpPerSession: 120,
    recommendedSessionsCompleted: 0,
    recommendedSessionProgressPercent: 0,
    recommendedSessionSummary: '0/1 runda',
    recommendedSessionNextBadgeName: 'Pewny krok',
    operationPerformance: [],
    recentSessions: [],
    weeklyActivity: [],
    recommendations: [],
  },
  maxWeeklyGames: 1,
  xpToNextLevel: 420,
  navigateToLogin: vi.fn(),
  ...overrides,
});

describe('KangurLearnerProfileOverviewWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));
    window.localStorage.clear();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the next locked badge milestone alongside the default daily quest summary', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent('0%');
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Pierwsza lekcja startowa'
    );
    expect(screen.getByText('Pierwsza lekcja startowa')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      '0/1 lekcja dzisiaj'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Nagroda +40 XP'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('learner-profile-overview-average-accuracy')).toHaveTextContent(
      '80%'
    );
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent('+28');
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent(
      '7 dni: +112 XP'
    );
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent(
      'średnio 120 XP na sesję'
    );
    expect(screen.getByTestId('learner-profile-overview-badges')).toHaveTextContent('2/11');
    expect(screen.getByText('Następna: Pół tysiąca XP · 480/500 XP')).toBeInTheDocument();
    expect(screen.queryByTestId('learner-profile-overview-guided-rounds')).toBeNull();
  });

  it('shows a ready daily quest reward when today progress completes the stored quest', () => {
    getCurrentKangurDailyQuest(progressWithWeakLesson);

    useKangurLearnerProfileRuntimeMock.mockReturnValue(
      buildRuntimeValue({
        progress: progressAfterRecovery,
      })
    );

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent('100%');
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Powtórka: Dzielenie'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      '82% / 75% opanowania'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Nagroda gotowa +55 XP'
    );
  });

  it('shows a claimed daily quest reward after the quest bonus was already collected', () => {
    getCurrentKangurDailyQuest(progressWithWeakLesson);
    claimCurrentKangurDailyQuestReward(progressAfterRecovery);

    useKangurLearnerProfileRuntimeMock.mockReturnValue(
      buildRuntimeValue({
        progress: progressAfterRecovery,
      })
    );

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Nagroda odebrana +55 XP'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('shows guided-session momentum once the learner starts following recommended rounds', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(
      buildRuntimeValue({
        snapshot: {
          ...buildRuntimeValue().snapshot,
          recommendedSessionsCompleted: 2,
          recommendedSessionProgressPercent: 67,
          recommendedSessionSummary: '2/3 rundy',
          recommendedSessionNextBadgeName: 'Trzymam kierunek',
        },
      })
    );

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-guided-rounds')).toHaveTextContent('2');
    expect(screen.getByTestId('learner-profile-overview-guided-rounds')).toHaveTextContent(
      'Do odznaki: Trzymam kierunek · 2/3 rundy'
    );
    expect(screen.getByTestId('learner-profile-overview-guided-rounds-bar')).toHaveAttribute(
      'aria-valuenow',
      '67'
    );
  });

  it('uses Mongo-backed overview intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-overview',
        title: 'Przegląd wyników',
        summary: 'Mongo opis najważniejszych wskaźników profilu ucznia.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-intro')).toHaveTextContent(
      'Przegląd wyników'
    );
    expect(screen.getByTestId('learner-profile-overview-intro')).toHaveTextContent(
      'Mongo opis najważniejszych wskaźników profilu ucznia.'
    );
  });
});

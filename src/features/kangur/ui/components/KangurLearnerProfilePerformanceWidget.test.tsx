/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  buildKangurOperationPracticeHref: (basePath: string, operation: string) =>
    `${basePath}/game?quickStart=operation&operation=${operation}`,
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

let KangurLearnerProfilePerformanceWidget: typeof import('./KangurLearnerProfilePerformanceWidget').KangurLearnerProfilePerformanceWidget;

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
    operationPerformance: [
      {
        operation: 'clock',
        label: 'Zegar',
        emoji: '🕐',
        attempts: 3,
        averageAccuracy: 83,
        averageScore: 5,
        bestScore: 100,
        totalXpEarned: 84,
        averageXpPerSession: 28,
      },
    ],
    recentSessions: [],
    weeklyActivity: [
      { dateKey: '2026-03-03', label: 'wt.', games: 0, averageAccuracy: 0 },
      { dateKey: '2026-03-04', label: 'sr.', games: 1, averageAccuracy: 70 },
      { dateKey: '2026-03-05', label: 'czw.', games: 0, averageAccuracy: 0 },
      { dateKey: '2026-03-06', label: 'pt.', games: 1, averageAccuracy: 80 },
      { dateKey: '2026-03-07', label: 'sob.', games: 0, averageAccuracy: 0 },
      { dateKey: '2026-03-08', label: 'niedz.', games: 1, averageAccuracy: 100 },
      { dateKey: '2026-03-09', label: 'pon.', games: 1, averageAccuracy: 75 },
    ],
    recommendations: [],
  },
  maxWeeklyGames: 1,
  xpToNextLevel: 420,
  navigateToLogin: vi.fn(),
  ...overrides,
});

describe('KangurLearnerProfilePerformanceWidget', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ KangurLearnerProfilePerformanceWidget } = await import(
      './KangurLearnerProfilePerformanceWidget'
    ));
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('shows xp rhythm and operation training actions alongside weekly activity', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfilePerformanceWidget />);

    expect(screen.getByTestId('learner-profile-xp-summary-today')).toHaveTextContent(
      'todayChip'
    );
    expect(screen.getByTestId('learner-profile-xp-summary-weekly')).toHaveTextContent(
      'weeklyChip'
    );
    expect(screen.getByTestId('learner-profile-xp-summary-average')).toHaveTextContent(
      'averageChip'
    );
    expect(screen.queryByTestId('learner-profile-xp-summary-guided')).toBeNull();
    expect(screen.getByTestId('learner-profile-weekly-activity-2026-03-08')).toHaveAttribute(
      'title',
      'activityBarTitle'
    );
    expect(screen.getByTestId('learner-profile-operation-progress-clock')).toHaveAttribute(
      'aria-valuenow',
      '83'
    );
    expect(screen.getByText('operationStats')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'train' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=operation&operation=clock'
    );
  });

  it('shows a guided-round rhythm chip when recommendation progress exists', () => {
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

    render(<KangurLearnerProfilePerformanceWidget />);

    expect(screen.getByTestId('learner-profile-xp-summary-guided')).toHaveTextContent(
      'guidedChipPrefix'
    );
  });

  it('uses Mongo-backed performance intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-performance',
        title: 'Skuteczność ucznia',
        summary: 'Mongo opis rytmu aktywności i wyników operacji.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfilePerformanceWidget />);

    expect(screen.getByTestId('learner-profile-performance-intro')).toHaveTextContent(
      'Skuteczność ucznia'
    );
    expect(screen.getByTestId('learner-profile-performance-intro')).toHaveTextContent(
      'Mongo opis rytmu aktywności i wyników operacji.'
    );
  });
});

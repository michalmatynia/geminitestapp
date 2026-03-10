/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

import { KangurLearnerProfileOverviewWidget } from './KangurLearnerProfileOverviewWidget';

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
  });

  it('shows the next locked badge milestone alongside the badge count', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-average-accuracy')).toHaveTextContent(
      '80%'
    );
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent('+28');
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent(
      '7 dni: +112 XP'
    );
    expect(screen.getByTestId('learner-profile-overview-xp-today')).toHaveTextContent(
      'srednio 120 XP na sesje'
    );
    expect(screen.getByTestId('learner-profile-overview-badges')).toHaveTextContent('2/11');
    expect(screen.getByText('Nastepna: Pol tysiaca XP · 480/500 XP')).toBeInTheDocument();
  });
});

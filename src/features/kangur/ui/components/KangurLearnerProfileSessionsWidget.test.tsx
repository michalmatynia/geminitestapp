/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  formatKangurProfileDateTime: (value: string) => `formatted:${value}`,
  formatKangurProfileDuration: (seconds: number) => `${seconds}s`,
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

import { KangurLearnerProfileSessionsWidget } from './KangurLearnerProfileSessionsWidget';

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
    operationPerformance: [],
    recentSessions: [
      {
        id: 'session-1',
        operation: 'clock',
        operationLabel: 'Zegar',
        operationEmoji: '🕐',
        createdAt: '2026-03-08T10:00:00.000Z',
        score: 5,
        totalQuestions: 6,
        accuracyPercent: 83,
        timeTakenSeconds: 41,
      },
    ],
    weeklyActivity: [],
    recommendations: [],
  },
  maxWeeklyGames: 1,
  xpToNextLevel: 420,
  navigateToLogin: vi.fn(),
  ...overrides,
});

describe('KangurLearnerProfileSessionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows badge progress for locked profile badges', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileSessionsWidget />);

    expect(screen.getByTestId('learner-profile-session-session-1')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-badge-first_game')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getByTestId('learner-profile-badge-ten_games')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getByTestId('learner-profile-badge-ten_games')).toHaveTextContent('4/10 gier');
  });
});

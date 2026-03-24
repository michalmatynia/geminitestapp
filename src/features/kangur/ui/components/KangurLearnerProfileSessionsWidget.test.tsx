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
  formatKangurProfileDateTime: (value: string) => `formatted:${value}`,
  formatKangurProfileDuration: (seconds: number) => `${seconds}s`,
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
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
        xpEarned: 28,
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
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('shows grouped badge-track progress for learner profile badges', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileSessionsWidget />);

    expect(screen.getByTestId('learner-profile-session-session-1')).toBeInTheDocument();
    expect(screen.getByText('Ostatnie sesje')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Ścieżki odznak')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Zegar')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByText('formatted:2026-03-08T10:00:00.000Z')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('41s')).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('learner-profile-session-xp-session-1')).toHaveTextContent(
      '+28 XP'
    );
    expect(screen.getByTestId('learner-profile-badge-track-onboarding')).toHaveTextContent(
      'Start'
    );
    expect(screen.getByTestId('learner-profile-badge-track-onboarding')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('learner-profile-badge-track-xp')).toHaveTextContent(
      'Następny kamień milowy'
    );
    expect(screen.getByTestId('learner-profile-badge-track-xp')).toHaveTextContent(
      'Pół tysiąca XP'
    );
    expect(screen.getByTestId('learner-profile-badge-track-xp')).toHaveTextContent(
      '480/500 XP'
    );
    expect(screen.queryByTestId('learner-profile-badge-track-variety')).toBeNull();
  });

  it('shows a short empty hint when badge progress has not started yet', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(
      buildRuntimeValue({
        progress: {
          totalXp: 0,
          gamesPlayed: 0,
          perfectGames: 0,
          lessonsCompleted: 0,
          clockPerfect: 0,
          calendarPerfect: 0,
          geometryPerfect: 0,
          badges: [],
          operationsPlayed: [],
          lessonMastery: {},
          totalCorrectAnswers: 0,
          totalQuestionsAnswered: 0,
          currentWinStreak: 0,
          bestWinStreak: 0,
          activityStats: {},
        },
      })
    );

    render(<KangurLearnerProfileSessionsWidget />);

    expect(screen.getByTestId('learner-profile-badges-empty')).toHaveTextContent(
      'Kolejne odznaki pojawiają się wraz z postępem.'
    );
    expect(screen.queryByTestId('learner-profile-badge-first_game')).toBeNull();
  });

  it('uses Mongo-backed sessions intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-sessions',
        title: 'Historia sesji',
        summary: 'Mongo opis ostatnich podejść i ścieżek odznak.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileSessionsWidget />);

    expect(screen.getByTestId('learner-profile-sessions-intro')).toHaveTextContent(
      'Historia sesji'
    );
    expect(screen.getByTestId('learner-profile-sessions-intro')).toHaveTextContent(
      'Mongo opis ostatnich podejść i ścieżek odznak.'
    );
  });
});

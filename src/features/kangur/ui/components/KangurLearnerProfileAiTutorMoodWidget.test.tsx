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
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

import { KangurLearnerProfileAiTutorMoodWidget } from './KangurLearnerProfileAiTutorMoodWidget';

const buildRuntimeValue = (overrides?: Record<string, unknown>) => ({
  basePath: '/kangur',
  user: null,
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
  },
  scores: [],
  isLoadingScores: false,
  scoresError: null,
  snapshot: {
    totalXp: 0,
    gamesPlayed: 0,
    lessonsCompleted: 0,
    perfectGames: 0,
    totalBadges: 0,
    unlockedBadges: 0,
    unlockedBadgeIds: [],
    level: { level: 1, minXp: 0, title: 'Start' },
    nextLevel: null,
    levelProgressPercent: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastPlayedAt: null,
    dailyGoalGames: 3,
    todayGames: 0,
    dailyGoalPercent: 0,
    operationPerformance: [],
    recentSessions: [],
    weeklyActivity: [],
    recommendations: [],
  },
  maxWeeklyGames: 1,
  xpToNextLevel: 0,
  navigateToLogin: vi.fn(),
  ...overrides,
});

describe('KangurLearnerProfileAiTutorMoodWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the persisted tutor mood for the active learner profile', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(
      buildRuntimeValue({
        user: {
          activeLearner: {
            id: 'learner-1',
            displayName: 'Jan',
            aiTutor: {
              currentMoodId: 'proud',
              baselineMoodId: 'supportive',
              confidence: 0.82,
              lastComputedAt: '2026-03-08T08:00:00.000Z',
              lastReasonCode: 'progress_gain',
            },
          },
        },
      })
    );

    render(<KangurLearnerProfileAiTutorMoodWidget />);

    expect(screen.getByTestId('learner-profile-ai-tutor-mood-current')).toHaveTextContent('Dumny');
    expect(
      screen.getByTestId('learner-profile-ai-tutor-mood-confidence').parentElement
    ).toHaveClass(
      '[border-color:var(--kangur-soft-card-border)]'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'proud'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-description')).toHaveTextContent(
      'Tutor podkresla postep'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-baseline')).toHaveTextContent(
      'Wspierajacy'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-confidence')).toHaveTextContent(
      '82%'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-updated')).toHaveTextContent(
      'formatted:2026-03-08T08:00:00.000Z'
    );
  });

  it('falls back to a neutral unsaved state in local mode', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileAiTutorMoodWidget />);

    expect(screen.getByTestId('learner-profile-ai-tutor-mood-current')).toHaveTextContent(
      'Neutralny'
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-baseline')).toHaveTextContent(
      'Neutralny'
    );
    expect(screen.getByText(/trybie lokalnym tutor dziala/i)).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-updated')).toHaveTextContent(
      'Jeszcze nie obliczono'
    );
  });
});

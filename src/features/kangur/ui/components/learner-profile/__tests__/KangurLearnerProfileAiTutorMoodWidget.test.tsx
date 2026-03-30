/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  formatKangurProfileDateTime: (value: string) => `formatted:${value}`,
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileAiTutorMoodWidget } from '../KangurLearnerProfileAiTutorMoodWidget';

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
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
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
      /Tutor podkreśla postęp/i
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-baseline')).toHaveTextContent(
      'Wspierający'
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
    expect(screen.getByTestId('learner-profile-ai-tutor-mood')).toHaveTextContent(
      repairKangurPolishCopy(
        'W trybie lokalnym tutor działa, ale nastrój nie zapisuje się per uczeń.'
      )
    );
    expect(screen.getByTestId('learner-profile-ai-tutor-mood-updated')).toHaveTextContent(
      'Jeszcze nie obliczono'
    );
  });

  it('uses Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-ai-tutor-mood',
        title: 'Nastrój Tutor-AI',
        summary: 'Mongo opis tonu wsparcia i ostatniej analizy nastroju.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue(buildRuntimeValue());

    render(<KangurLearnerProfileAiTutorMoodWidget />);

    expect(screen.getByText('Nastrój Tutor-AI')).toBeInTheDocument();
    expect(
      screen.getByText('Mongo opis tonu wsparcia i ostatniej analizy nastroju.')
    ).toBeInTheDocument();
  });
});

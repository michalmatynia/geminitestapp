import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('lucide-react', () => ({
  Award: () => <div data-testid='icon-award' />,
  BarChart2: () => <div data-testid='icon-barchart' />,
  Compass: () => <div data-testid='icon-compass' />,
  Flame: () => <div data-testid='icon-flame' />,
  Sparkles: () => <div data-testid='icon-sparkles' />,
  Target: () => <div data-testid='icon-target' />,
  Eye: () => <div data-testid='icon-eye' />,
  EyeOff: () => <div data-testid='icon-eye-off' />,
}));

const {
  useKangurLearnerProfileRuntimeMock,
  useKangurPageContentEntryMock,
  useKangurAuthActionsMock,
} = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurAuthActionsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuthActions: useKangurAuthActionsMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileOverviewWidget } from './KangurLearnerProfileOverviewWidget';

describe('KangurLearnerProfileOverviewWidget placeholder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurAuthActionsMock.mockReturnValue({ checkAppState: vi.fn() });
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      snapshot: {
        totalXp: 480,
        unlockedBadges: 2,
        totalBadges: 11,
        averageAccuracy: 80,
        todayXpEarned: 28,
        weeklyXpEarned: 112,
        averageXpPerSession: 120,
        recommendedSessionsCompleted: 0,
        bestAccuracy: 100,
        currentStreakDays: 2,
        longestStreakDays: 3,
        todayGames: 1,
        dailyGoalGames: 3,
        dailyGoalPercent: 33,
      },
      progress: { 
        lessonMastery: {},
        operationsPlayed: [],
        totalXp: 480,
        gamesPlayed: 4,
        perfectGames: 1,
        lessonsCompleted: 2,
        badges: [],
        totalCorrectAnswers: 32,
        totalQuestionsAnswered: 40,
        currentWinStreak: 2,
        bestWinStreak: 2,
        activityStats: {},
      },
      user: { activeLearner: { id: 'learner-1', avatarId: 'star-fox' } },
    });
  });

  it('renders without crashing', () => {
    render(<KangurLearnerProfileOverviewWidget />);
    expect(true).toBe(true);
  });
});

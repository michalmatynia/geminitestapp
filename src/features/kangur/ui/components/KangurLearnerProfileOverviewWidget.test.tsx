import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { getKangurDailyQuestStorageKey } from '@/features/kangur/ui/services/daily-quests';

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
  useKangurSubjectFocusMock,
} = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurAuthActionsMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuthActions: useKangurAuthActionsMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurLearnerProfileOverviewWidget } from './KangurLearnerProfileOverviewWidget';

describe('KangurLearnerProfileOverviewWidget placeholder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useKangurAuthActionsMock.mockReturnValue({ checkAppState: vi.fn() });
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
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

  it('uses larger touch-friendly avatar buttons on coarse pointers', () => {
    render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getAllByRole('radio')[0]).toHaveClass(
      'h-12',
      'w-12',
      'touch-manipulation',
      'select-none'
    );
  });

  it('recomputes the overview daily quest when the active learner subject key changes', () => {
    const now = new Date();
    const localDateKey = [
      now.getFullYear(),
      `${now.getMonth() + 1}`.padStart(2, '0'),
      `${now.getDate()}`.padStart(2, '0'),
    ].join('-');
    const createdAt = `${localDateKey}T08:00:00.000Z`;
    const expiresAt = `${localDateKey}T23:59:59.999Z`;

    window.localStorage.setItem(
      getKangurDailyQuestStorageKey('maths', 'learner-1'),
      JSON.stringify({
        version: 1,
        dateKey: localDateKey,
        ownerKey: 'learner-1',
        createdAt,
        expiresAt,
        claimedAt: `${localDateKey}T10:15:00.000Z`,
        baselineGamesPlayed: 4,
        baselineLessonsCompleted: 2,
        subject: 'maths',
        assignment: {
          id: 'overview-quest-1',
          title: 'Quest learner 1',
          description: 'Quest learner 1 description',
          target: '1 powtórka + wynik min. 40%',
          priority: 'high',
          rewardXp: 55,
          questMetric: {
            kind: 'lesson_mastery',
            lessonComponentId: 'division',
            targetPercent: 40,
          },
        },
      })
    );
    window.localStorage.setItem(
      getKangurDailyQuestStorageKey('maths', 'learner-2'),
      JSON.stringify({
        version: 1,
        dateKey: localDateKey,
        ownerKey: 'learner-2',
        createdAt,
        expiresAt,
        claimedAt: null,
        baselineGamesPlayed: 4,
        baselineLessonsCompleted: 2,
        subject: 'maths',
        assignment: {
          id: 'overview-quest-2',
          title: 'Quest learner 2',
          description: 'Quest learner 2 description',
          target: '1 powtórka + wynik min. 40%',
          priority: 'high',
          rewardXp: 55,
          questMetric: {
            kind: 'lesson_mastery',
            lessonComponentId: 'division',
            targetPercent: 40,
          },
        },
      })
    );

    const { rerender } = render(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Quest learner 1'
    );

    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-2',
    });

    rerender(<KangurLearnerProfileOverviewWidget />);

    expect(screen.getByTestId('learner-profile-overview-daily-quest')).toHaveTextContent(
      'Quest learner 2'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-quest')).not.toHaveTextContent(
      'Quest learner 1'
    );
  });
});

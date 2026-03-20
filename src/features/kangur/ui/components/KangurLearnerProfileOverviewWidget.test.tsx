import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

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
    });
  });

  it('renders without crashing', () => {
    render(<KangurLearnerProfileOverviewWidget />);
    expect(true).toBe(true);
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const {
  useKangurProgressStateMock,
  useKangurAuthMock,
  useKangurLearnerProfileRuntimeMock,
  useKangurAssignmentsMock,
} = vi.hoisted(() => ({
  useKangurProgressStateMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => ({ basePath: '/kangur' }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
  useKangurAuthActions: () => ({ checkAppState: vi.fn() }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
  KangurLearnerProfileRuntimeBoundary: ({ children }) => <>{children}</>,
  getKangurLearnerProfileDisplayName: (user) => user.name,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

// Mock all heavy widgets
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget', () => ({ KangurLearnerProfileAiTutorMoodWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget', () => ({ KangurLearnerProfileAssignmentsWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileHeroWidget', () => ({ KangurLearnerProfileHeroWidget: () => <div data-testid='hero' /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget', () => ({ KangurLearnerProfileLevelProgressWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget', () => ({ KangurLearnerProfileMasteryWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget', () => ({ KangurLearnerProfileOverviewWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget', () => ({ KangurLearnerProfilePerformanceWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileQuestSummaryWidget', () => ({ KangurLearnerProfileQuestSummaryWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget', () => ({ KangurLearnerProfileRecommendationsWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget', () => ({ KangurLearnerProfileSessionsWidget: () => <div /> }));
vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({ KangurTopNavigationController: () => <div /> }));

import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';

describe('LearnerProfile page placeholder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const commonProgress = { totalXp: 1200, gamesPlayed: 5, lessonsCompleted: 3, badges: [], lessonMastery: {}, operationsPlayed: [] };
    useKangurProgressStateMock.mockReturnValue({ progress: commonProgress, isLoading: false });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      user: { id: 'u1', name: 'Jan', activeLearner: { id: 'l1', name: 'Jan' } },
      progress: commonProgress,
      snapshot: { level: { level: 1 }, totalXp: 1200, recommendations: [], missions: [], weeklyActivity: [] },
      isLoadingScores: false,
    });
    useKangurAuthMock.mockReturnValue({ user: { id: 'u1', activeLearner: { id: 'l1', name: 'Jan' } } });
    useKangurAssignmentsMock.mockReturnValue({ assignments: [], isLoading: false });
  });

  it('renders without crashing', () => {
    render(<LearnerProfile />);
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });
});

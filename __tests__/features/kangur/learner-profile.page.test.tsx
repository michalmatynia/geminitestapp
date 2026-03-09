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

    render(<LearnerProfile />);

    expect(scoreFilterMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Zaloguj sie, aby synchronizowac postep ucznia miedzy urzadzeniami. Jesli nie masz jeszcze konta rodzica, zaloz je tutaj.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-operation-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
    expect(screen.getByText('Brak danych o operacjach.')).toBeInTheDocument();

    const loginButton = screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' });
    const createAccountButton = screen.getByRole('button', { name: 'Utworz konto rodzica' });
    await userEvent.click(loginButton);
    await userEvent.click(createAccountButton);
    expect(navigateToLoginMock).toHaveBeenCalledTimes(2);
    expect(navigateToLoginMock).toHaveBeenLastCalledWith({
      authMode: 'create-account',
    });
  });

  it('renders without crashing', () => {
    render(<LearnerProfile />);
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });
});

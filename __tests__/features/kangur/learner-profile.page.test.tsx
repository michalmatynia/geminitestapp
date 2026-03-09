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

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    useOptionalKangurRoutingMock.mockReturnValue(null);
    loadProgressMock.mockReturnValue(baseProgress);
    useKangurAuthMock.mockReturnValue({
      user: createUser(),
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });
  });

  it('loads user scores and renders profile metrics', async () => {
    scoreFilterMock.mockImplementation(
      (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return Promise.resolve([
            createScore({ id: 's1', operation: 'addition', correct_answers: 8 }),
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
          ]);
        }
        if (criteria.player_name) {
          return Promise.resolve([
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
            createScore({ id: 's3', operation: 'division', correct_answers: 6, score: 6 }),
          ]);
        }
        return Promise.resolve([]);
      }
    );

    render(<LearnerProfile />);

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(2));
    expect(scoreFilterMock).toHaveBeenCalledWith({ created_by: 'jan@example.com' }, '-created_date', 120);
    expect(scoreFilterMock).toHaveBeenCalledWith({ player_name: 'Jan' }, '-created_date', 120);

    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === 'Statystyki ucznia: Jan.')
    ).toBeInTheDocument();
    expect(screen.getByText('Poziom 4 · 620 XP lacznie')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-overview-average-accuracy')).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
    expect(screen.getByTestId('learner-profile-overview-streak')).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-goal')).toHaveClass(
      'soft-card',
      'border-teal-300'
    );
    expect(screen.getByTestId('learner-profile-overview-badges')).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByTestId('learner-profile-level-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '30'
    );
    expect(screen.getByTestId('learner-profile-weekly-activity-2026-03-06')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('learner-profile-weekly-activity-2026-03-07')).toHaveAttribute(
      'data-active',
      'false'
    );
    expect(screen.getByText('Wyniki wg operacji')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-operation-progress-addition')).toHaveAttribute(
      'aria-valuenow',
      '80'
    );
    expect(screen.getByTestId('learner-profile-session-s2')).toHaveClass(
      'soft-card',
      'border-violet-300'
    );
    expect(screen.getByTestId('learner-profile-session-score-s2')).toHaveClass(
      'border-emerald-200',
      'bg-emerald-100'
    );
    expect(screen.getByTestId('learner-profile-badge-first_game')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getByTestId('learner-profile-badge-clock_master')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getByText('Plan na dzis')).toBeInTheDocument();
    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(screen.getAllByText('➗ Dzielenie').length).toBeGreaterThan(0);
    expect(screen.getByText('🕐 Nauka zegara')).toBeInTheDocument();
    expect(screen.getByText('Priorytet sredni')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-recommendation-focus_weakest_operation')).toHaveClass(
      'soft-card',
      'border-rose-300'
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Otworz lekcje' })
        .map((link) => link.getAttribute('href'))
    ).toContain('/kangur/lessons?focus=division');
    expect(screen.getAllByRole('link', { name: 'Otworz lekcje' })[0]).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
    expect(screen.getByRole('link', { name: /zagraj/i })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.getByRole('link', { name: /zagraj/i })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
    expect(screen.getByText('➕ Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('✖️ Mnozenie')).toBeInTheDocument();
    expect(screen.getAllByText('➗ Dzielenie').length).toBeGreaterThan(0);
    const operationTrainingHrefs = screen
      .getAllByRole('link', { name: 'Trenuj' })
      .map((link) => link.getAttribute('href'));
    expect(operationTrainingHrefs).toEqual(
      expect.arrayContaining([
        '/kangur/game?quickStart=operation&operation=multiplication&difficulty=hard',
        '/kangur/game?quickStart=operation&operation=addition&difficulty=medium',
        '/kangur/game?quickStart=operation&operation=division&difficulty=easy',
      ])
    );
    expect(screen.queryByRole('button', { name: /Zaloguj sie/i })).not.toBeInTheDocument();
  });

  it('keeps profile in local mode when user is not authenticated', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
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

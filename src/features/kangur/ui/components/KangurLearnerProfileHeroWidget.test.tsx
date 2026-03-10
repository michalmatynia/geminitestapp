/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, useKangurLearnerProfileRuntimeMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  getKangurLearnerProfileDisplayName: (user: { activeLearner?: { displayName?: string } | null } | null) =>
    user?.activeLearner?.displayName ?? 'Tryb lokalny',
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';

describe('KangurLearnerProfileHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the shared intro-card shell and routes back home', () => {
    const navigateToLogin = vi.fn();

    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      navigateToLogin,
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
        bestWinStreak: 0,
        activityStats: {},
      },
      user: null,
    });

    render(<KangurLearnerProfileHeroWidget />);

    expect(screen.getByTestId('kangur-learner-profile-hero')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toHaveClass('text-3xl');
    expect(
      screen.getByText(
        'Zaloguj sie, aby synchronizowac postep ucznia miedzy urzadzeniami. Jesli nie masz jeszcze konta rodzica, zaloz je tutaj.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur');
    expect(navigateToLogin).toHaveBeenCalledTimes(2);
    expect(navigateToLogin).toHaveBeenLastCalledWith({
      authMode: 'create-account',
    });
  });

  it('keeps the shared top section without the login CTA when a learner is active', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      navigateToLogin: vi.fn(),
      progress: {
        totalXp: 480,
        gamesPlayed: 4,
        perfectGames: 1,
        lessonsCompleted: 2,
        clockPerfect: 1,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: [],
        operationsPlayed: ['addition', 'clock'],
        lessonMastery: {
          clock: {
            attempts: 2,
            completions: 2,
            masteryPercent: 82,
            bestScorePercent: 90,
            lastScorePercent: 82,
            lastCompletedAt: '2026-03-10T11:00:00.000Z',
          },
        },
        totalCorrectAnswers: 20,
        totalQuestionsAnswered: 25,
        dailyQuestsCompleted: 1,
        bestWinStreak: 2,
        activityStats: {},
      },
      user: {
        activeLearner: {
          displayName: 'Ala',
        },
      },
    });

    render(<KangurLearnerProfileHeroWidget />);

    expect(screen.getByTestId('kangur-learner-profile-hero')).toHaveClass('text-center');
    expect(screen.getByText('Ala')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-next-badge')).toHaveTextContent(
      '⭐ Pol tysiaca XP'
    );
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-track-quest')).toHaveTextContent(
      'Misje'
    );
    expect(
      screen.getByTestId('kangur-learner-profile-hero-milestone-track-mastery')
    ).toHaveTextContent('Mistrzostwo');
    expect(
      screen.queryByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' })
    ).not.toBeInTheDocument();
  });
});

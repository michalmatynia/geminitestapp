/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurLoginModalMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurLoginModalMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
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
    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal: vi.fn(),
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: false,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
    });
  });

  it('renders the hero shell without intro copy or back button', () => {
    const openLoginModal = vi.fn();

    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      navigateToLogin: vi.fn(),
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
    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal: vi.fn(),
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: false,
      isRouteDriven: false,
      openLoginModal,
    });

    render(<KangurLearnerProfileHeroWidget />);

    expect(screen.getByTestId('kangur-learner-profile-hero')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong',
      'text-center'
    );
    expect(
      screen.queryByRole('heading', { name: 'Profil ucznia' })
    ).toBeNull();
    expect(
      screen.queryByText(
        'Zaloguj się, aby synchronizować postęp ucznia między urządzeniami. Jeśli nie masz jeszcze konta rodzica, załóż je tutaj.'
      )
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Wróć do poprzedniej strony' })
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(openLoginModal).toHaveBeenCalledTimes(2);
    expect(openLoginModal).toHaveBeenLastCalledWith(null, {
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
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-next-badge')).toHaveTextContent(
      '⭐ Pół tysiąca XP'
    );
    expect(screen.getByTestId('kangur-learner-profile-hero-milestone-track-quest')).toHaveClass(
      'soft-card',
      'border',
      'rounded-[24px]'
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

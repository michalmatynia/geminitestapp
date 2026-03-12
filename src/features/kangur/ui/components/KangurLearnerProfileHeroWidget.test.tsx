/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routeNavigatorPushMock, useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  routeNavigatorPushMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    prefetch: vi.fn(),
    push: routeNavigatorPushMock,
    replace: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  getKangurLearnerProfileDisplayName: (user: { activeLearner?: { displayName?: string } | null } | null) =>
    user?.activeLearner?.displayName ?? 'Tryb lokalny',
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';

describe('KangurLearnerProfileHeroWidget', () => {
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
        'Zaloguj się, aby synchronizować postęp ucznia między urządzeniami. Jeśli nie masz jeszcze konta rodzica, załóż je tutaj.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zaloguj się, aby synchronizować postęp' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utwórz konto rodzica' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się, aby synchronizować postęp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(routeNavigatorPushMock).toHaveBeenCalledWith('/kangur', {
      acknowledgeMs: 110,
      pageKey: 'Game',
      sourceId: 'learner-profile-hero:back',
    });
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
    expect(screen.getByText('Ala')).toHaveClass('[color:var(--kangur-page-text)]');
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
      screen.queryByRole('button', { name: 'Zaloguj się, aby synchronizować postęp' })
    ).not.toBeInTheDocument();
  });

  it('uses Mongo-backed hero copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-hero',
        title: 'Profil ucznia',
        summary: 'Mongo opis profilu ucznia i jego kamieni milowych.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
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
        lessonMastery: {},
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

    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-learner-profile-hero')).toHaveTextContent(
      'Mongo opis profilu ucznia i jego kamieni milowych. Ala.'
    );
    expect(screen.getByText('Ala')).toBeInTheDocument();
  });
});

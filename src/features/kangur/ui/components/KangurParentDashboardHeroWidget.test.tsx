/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routeNavigatorPushMock, useKangurParentDashboardRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  routeNavigatorPushMock: vi.fn(),
  useKangurParentDashboardRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    prefetch: vi.fn(),
    push: routeNavigatorPushMock,
    replace: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: useKangurParentDashboardRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';

describe('KangurParentDashboardHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
  });

  it('uses the shared intro-card shell for unauthenticated access', () => {
    const navigateToLogin = vi.fn();

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: null,
      basePath: '/kangur',
      canManageLearners: false,
      isAuthenticated: false,
      logout: vi.fn(),
      navigateToLogin,
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget />);

    expect(screen.getByTestId('kangur-parent-dashboard-hero')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Panel Rodzica / Nauczyciela' })).toHaveClass(
      'text-3xl'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(navigateToLogin).toHaveBeenCalledTimes(2);
    expect(navigateToLogin).toHaveBeenLastCalledWith({
      authMode: 'create-account',
    });
  });

  it('routes back to the learner profile in the authenticated dashboard view', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: 'Trening mieszany',
        action: {
          label: 'Uruchom trening',
          page: 'Game',
          query: {
            quickStart: 'training',
          },
        },
        questLabel: 'Misja dnia',
      },
      progress: {
        percent: 100,
        summary: '1/1 runda dzisiaj',
        status: 'completed',
      },
      reward: {
        label: 'Nagroda gotowa +36 XP',
        status: 'ready',
      },
    });

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      basePath: '/kangur',
      canManageLearners: true,
      isAuthenticated: true,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      progress: {
        totalXp: 480,
        gamesPlayed: 4,
        perfectGames: 1,
        lessonsCompleted: 2,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: [],
        operationsPlayed: [],
        totalCorrectAnswers: 20,
        totalQuestionsAnswered: 25,
        dailyQuestsCompleted: 1,
        bestWinStreak: 2,
        activityStats: {},
        lessonMastery: {
          division: {
            attempts: 2,
            completions: 2,
            masteryPercent: 82,
            bestScorePercent: 90,
            lastScorePercent: 82,
            lastCompletedAt: '2026-03-10T11:00:00.000Z',
          },
        },
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByTestId('kangur-parent-dashboard-hero')).toHaveClass('text-center');
    expect(screen.getByRole('heading', { name: 'Panel Rodzica' })).toHaveClass('text-3xl');
    expect(screen.getByText('parent@example.com')).toBeInTheDocument();
    expect(screen.getByText('Maja')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-parent-dashboard-daily-quest')).toHaveTextContent(
      'Misja dnia'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-daily-quest')).toHaveTextContent(
      'Maja: Trening mieszany'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-daily-quest')).toHaveTextContent(
      '1/1 runda dzisiaj'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-daily-quest')).toHaveTextContent(
      'Nagroda gotowa +36 XP'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-summary')).toHaveTextContent(
      'Ścieżki postępu ucznia'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-hero-milestone-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-parent-dashboard-hero-milestone-next-badge')).toHaveTextContent(
      '⭐ Pół tysiąca XP'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-quest')).toHaveTextContent(
      'Misje'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-quest')).toHaveTextContent(
      '1/4 odznak'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-onboarding')).toHaveTextContent(
      'Start'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-onboarding')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-onboarding')).toHaveTextContent(
      'Wszystkie odznaki odblokowane'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-challenge')).toHaveTextContent(
      'Wyzwania'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-challenge')).toHaveTextContent(
      '1/2 odznak'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-challenge')).toHaveTextContent(
      'Celny umysł · 80% / 85%'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.queryByRole('button', { name: 'Wyloguj' })).not.toBeInTheDocument();

  });

  it('does not render the summary copy in the authenticated hero view', () => {
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => ({
      data: undefined,
      entry:
        entryId === 'parent-dashboard-hero'
          ? {
            id: 'parent-dashboard-hero',
            title: 'Panel Rodzica',
            summary: 'To centrum decyzji opiekuna.',
          }
          : {
            id: 'parent-dashboard-guest-hero',
            title: 'Panel Rodzica / Nauczyciela',
            summary: 'Sprawdź, jak odblokować widok opiekuna.',
          },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    }));
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      basePath: '/kangur',
      canManageLearners: true,
      isAuthenticated: true,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      progress: {
        totalXp: 480,
        gamesPlayed: 4,
        perfectGames: 1,
        lessonsCompleted: 2,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: [],
        operationsPlayed: [],
        totalCorrectAnswers: 20,
        totalQuestionsAnswered: 25,
        dailyQuestsCompleted: 1,
        bestWinStreak: 2,
        activityStats: {},
        lessonMastery: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.queryByText(/To centrum decyzji opiekuna\./)).toBeNull();
  });

  it('hides learner progress details when no active learner is selected', () => {
    const setCreateLearnerModalOpen = vi.fn();

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: null,
      basePath: '/kangur',
      canManageLearners: true,
      isAuthenticated: true,
      logout: vi.fn(),
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
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
        bestWinStreak: 0,
        activityStats: {},
        lessonMastery: {},
      },
      setCreateLearnerModalOpen,
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.queryByTestId('kangur-parent-dashboard-daily-quest')).toBeNull();
    expect(screen.queryByTestId('kangur-parent-dashboard-track-summary')).toBeNull();
    expect(screen.getByText('Brak profilu ucznia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj ucznia' }));
    expect(setCreateLearnerModalOpen).toHaveBeenCalledWith(true);
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
  });
});

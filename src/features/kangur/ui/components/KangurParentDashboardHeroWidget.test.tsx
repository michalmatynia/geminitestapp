/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, useKangurParentDashboardRuntimeMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  useKangurParentDashboardRuntimeMock: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: useKangurParentDashboardRuntimeMock,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';

describe('KangurParentDashboardHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
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

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj sie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur');
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
      activeLearner: { displayName: 'Maja' },
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
      'Sciezki postepu ucznia'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-hero-milestone-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-parent-dashboard-hero-milestone-next-badge')).toHaveTextContent(
      '⭐ Pol tysiaca XP'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-quest')).toHaveTextContent(
      'Misje'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-quest')).toHaveTextContent(
      '1/2 odznak'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-mastery')).toHaveTextContent(
      'Mistrzostwo'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-track-mastery')).toHaveTextContent(
      'Budowniczy mistrzostwa · 1/3 lekcje'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.queryByRole('button', { name: 'Wyloguj' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur/profile');
  });
});

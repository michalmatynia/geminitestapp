/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import plMessages from '@/i18n/messages/pl.json';

const {
  routeNavigatorPushMock,
  settingsStoreMock,
  useKangurLoginModalMock,
  useKangurLearnerActivityStatusMock,
  useKangurParentDashboardRuntimeMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
  routeNavigatorPushMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  useKangurLoginModalMock: vi.fn(),
  useKangurLearnerActivityStatusMock: vi.fn(),
  useKangurParentDashboardRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    scroll?: boolean;
  }) => (
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

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
  useKangurLoginModalActions: useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntimeHeroState: () => {
    const value = useKangurParentDashboardRuntimeMock();
    return {
      activeLearner: value.activeLearner,
      basePath: value.basePath,
      canManageLearners: value.canManageLearners,
      isAuthenticated: value.isAuthenticated,
      lessons: value.lessons,
      progress: value.progress,
      viewerName: value.viewerName,
      viewerRoleLabel: value.viewerRoleLabel,
    };
  },
  useKangurParentDashboardRuntimeShellActions: () => {
    const value = useKangurParentDashboardRuntimeMock();
    return {
      logout: value.logout,
      setCreateLearnerModalOpen: value.setCreateLearnerModalOpen,
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLearnerActivity', () => ({
  useKangurLearnerActivityStatus: useKangurLearnerActivityStatusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget', () => ({
  KangurParentDashboardLearnerManagementWidget: () => (
    <div data-testid='parent-dashboard-learner-management-stub' />
  ),
}));

import { KangurParentDashboardHeroWidget } from '../KangurParentDashboardHeroWidget';

const heroMessages = plMessages.KangurParentDashboard.hero;

describe('KangurParentDashboardHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockReturnValue(undefined);
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
    useKangurLearnerActivityStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('uses the shared intro-card shell for unauthenticated access', () => {
    const openLoginModal = vi.fn();

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: null,
      basePath: '/kangur',
      canManageLearners: false,
      isAuthenticated: false,
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
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

    render(<KangurParentDashboardHeroWidget />);

    const signInButton = screen.getByRole('button', { name: heroMessages.signIn });
    const createAccountButton = screen.getByRole('button', {
      name: heroMessages.createParentAccountAria,
    });

    expect(screen.getByTestId('kangur-parent-dashboard-hero')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong',
      'text-center'
    );
    expect(screen.getByTestId('kangur-parent-dashboard-heading-art')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: heroMessages.unauthenticated.title })).toHaveClass(
      'text-2xl',
      'sm:text-3xl'
    );
    expect(signInButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(createAccountButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');

    fireEvent.click(signInButton);
    fireEvent.click(createAccountButton);

    expect(openLoginModal).toHaveBeenCalledTimes(2);
    expect(openLoginModal).toHaveBeenLastCalledWith(null, {
      authMode: 'create-account',
    });
    expect(useKangurPageContentEntryMock).toHaveBeenCalledTimes(1);
    expect(useKangurPageContentEntryMock).toHaveBeenCalledWith('parent-dashboard-guest-hero');
  });

  it('renders the authenticated dashboard view with the active learner', () => {
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByTestId('kangur-parent-dashboard-hero')).toHaveClass('text-center');
    expect(screen.getByTestId('kangur-parent-dashboard-heading-art')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: heroMessages.parentTitle })).toHaveClass(
      'text-2xl',
      'sm:text-3xl'
    );
    expect(screen.getByText('parent@example.com')).toBeInTheDocument();
    expect(screen.getByText('Maja')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-parent-dashboard-daily-quest')).toBeNull();
    expect(screen.queryByTestId('kangur-parent-dashboard-track-summary')).toBeNull();
    expect(screen.queryByTestId('kangur-parent-dashboard-hero-milestone-shell')).toBeNull();
    expect(screen.queryByRole('button', { name: 'hero.logout' })).not.toBeInTheDocument();
    expect(useKangurPageContentEntryMock).toHaveBeenCalledTimes(1);
    expect(useKangurPageContentEntryMock).toHaveBeenCalledWith('parent-dashboard-hero');

  });

  it('defers learner-activity polling when the authenticated parent hero mounts', () => {
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
      lessons: [],
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(useKangurLearnerActivityStatusMock).toHaveBeenCalledWith({
      deferInitialRefreshMs: 1200,
      enabled: true,
      learnerId: 'learner-1',
      refreshIntervalMs: 10000,
    });
  });

  it('routes the restricted hero action directly to the learner profile', () => {
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      basePath: '/kangur',
      canManageLearners: false,
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    fireEvent.click(screen.getByRole('button', { name: heroMessages.backToLearnerProfile }));

    expect(routeNavigatorPushMock).toHaveBeenCalledWith('/kangur/profile', {
      pageKey: 'LearnerProfile',
      sourceId: 'parent-dashboard-hero:back-profile',
    });
  });

  it('routes the quick lessons action directly from the dashboard hero nav', () => {
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget />);

    fireEvent.click(screen.getByRole('link', { name: heroMessages.nav.lessons }));

    expect(routeNavigatorPushMock).toHaveBeenCalledWith('/kangur/lessons', {
      pageKey: 'Lessons',
      scroll: false,
      sourceId: 'parent-dashboard-nav:lessons',
    });
  });

  it('renders the add-learner action in the header when learner management is enabled', () => {
    const setCreateLearnerModalOpen = vi.fn();
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen,
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} showLearnerManagement />);

    const addButton = screen.getByRole('button', { name: heroMessages.addLearner });
    expect(addButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    fireEvent.click(addButton);

    expect(setCreateLearnerModalOpen).toHaveBeenCalledWith(true);
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.queryByText(/To centrum decyzji opiekuna\./)).toBeNull();
  });

  it('shows a link to the learner activity when the learner is online', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T09:03:00.000Z'));
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });
    useKangurLearnerActivityStatusMock.mockReturnValue({
      status: {
        snapshot: {
          learnerId: 'learner-1',
          kind: 'lesson',
          title: 'Lekcja: Zegar',
          href: '/kangur/lessons?focus=clock',
          startedAt: '2026-03-15T09:00:00.000Z',
          updatedAt: '2026-03-15T09:02:00.000Z',
        },
        isOnline: true,
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByText(heroMessages.activity.status.online)).toBeInTheDocument();
    const openActivityLink = screen.getByRole('link', { name: heroMessages.openActivity });
    expect(openActivityLink).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=clock'
    );
    expect(openActivityLink).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');

    vi.useRealTimers();
  });

  it('falls back to activity log when observability is unavailable', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T09:05:00.000Z'));

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [
          {
            kind: 'lesson',
            title: 'Lekcja: Dodawanie',
            href: '/kangur/lessons?focus=adding',
            openedAt: '2026-03-15T09:04:30.000Z',
          },
        ],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });
    useKangurLearnerActivityStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByText(heroMessages.activity.status.online)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: heroMessages.openActivity })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=adding'
    );

    vi.useRealTimers();
  });

  it('falls back to monitoring session data for recent activity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T09:05:00.000Z'));

    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [],
        lessonPanelProgress: {
          clock: {
            intro: {
              viewedCount: 1,
              totalCount: 3,
              sessionUpdatedAt: '2026-03-15T08:55:00.000Z',
              label: 'Wprowadzenie',
            },
          },
        },
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });
    useKangurLearnerActivityStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByText(heroMessages.activity.status.recent)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows offline status when no activity signals are present', () => {
    useKangurParentDashboardRuntimeMock.mockReturnValue({
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });
    useKangurLearnerActivityStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.getByText(heroMessages.activity.status.offline)).toBeInTheDocument();
  });

  it('hides learner progress details when no active learner is selected', () => {
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
        openedTasks: [],
        lessonPanelProgress: {},
      },
      setCreateLearnerModalOpen: vi.fn(),
      viewerName: 'parent@example.com',
      viewerRoleLabel: 'Rodzic',
    });

    render(<KangurParentDashboardHeroWidget showActions={false} />);

    expect(screen.queryByTestId('kangur-parent-dashboard-daily-quest')).toBeNull();
    expect(screen.queryByTestId('kangur-parent-dashboard-track-summary')).toBeNull();
    expect(screen.getByText(heroMessages.noLearnerTitle)).toBeInTheDocument();
  });
});

/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

const {
  useKangurRoutingMock,
  useKangurProgressStateMock,
  useKangurAssignmentsMock,
  useKangurAuthMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
  authMeMock,
  redirectToLoginMock,
  logoutMock,
  lessonsState,
  disabledDocsTooltipsMock,
  getDisabledDocsTooltipsMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  authMeMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  disabledDocsTooltipsMock: {
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
  } as const,
  getDisabledDocsTooltipsMock: vi.fn(),
}));

getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameInstances', () => ({
  useKangurGameInstances: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameContentSets', () => ({
  useKangurGameContentSets: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    };
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
      redirectToLogin: redirectToLoginMock,
      logout: logoutMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/components/game', () => ({
  Leaderboard: () => <div data-testid='leaderboard' />,
  OperationSelector: () => <div data-testid='operation-selector' />,
  QuestionCard: () => <div data-testid='question-card' />,
  ResultScreen: () => <div data-testid='result-screen' />,
  TrainingSetup: () => <div data-testid='training-setup' />,
}));

vi.mock('@/features/kangur/ui/components/Leaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid='leaderboard' />,
}));

vi.mock('@/features/kangur/ui/components/progress', () => ({
  PlayerProgressCard: () => <div data-testid='player-progress-card' />,
  XpToast: () => null,
}));

vi.mock('@/features/kangur/ui/components/KangurPriorityAssignments', () => ({
  __esModule: true,
  KangurPriorityAssignments: () => <div data-testid='kangur-priority-assignments' />,
  default: () => <div data-testid='kangur-priority-assignments' />,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
  __esModule: true,
  KangurAssignmentSpotlight: () => <div data-testid='kangur-assignment-spotlight' />,
  default: () => <div data-testid='kangur-assignment-spotlight' />,
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-practice-assignment-banner' />,
}));

vi.mock('@/features/kangur/ui/components/CalendarTrainingGame', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-calendar-training-game'>Mock Calendar Training</div>,
}));

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-geometry-training-game'>Mock Geometry Training</div>,
}));

import Game from '@/features/kangur/ui/pages/Game';

const renderGamePage = () =>
  render(
    <KangurGuestPlayerProvider>
      <Game />
    </KangurGuestPlayerProvider>
  );

const baseProgress: KangurProgressState = {
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
};

const getFeaturedHomeAction = (label: string): HTMLElement => {
  const action = screen
    .getAllByText(label)
    .map((node) => node.closest('a, button'))
    .find((node) => node?.classList.contains('home-action-featured'));

  expect(action).toBeTruthy();

  return action as HTMLElement;
};

describe('Game branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    useKangurProgressStateMock.mockReturnValue(baseProgress);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });
    useKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      logout: logoutMock,
      navigateToLogin: redirectToLoginMock,
      user: null,
    });
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'guest',
    });
    lessonsState.value = [
      {
        id: 'kangur-lesson-calendar',
        componentId: 'calendar',
        title: 'Nauka kalendarza',
        description: 'Dni i miesiące',
        emoji: '📅',
        color: 'kangur-gradient-accent-emerald',
        activeBg: 'bg-emerald-500',
        sortOrder: 2000,
        enabled: true,
        subject: 'maths',
      },
      {
        id: 'kangur-lesson-geometry-shapes',
        componentId: 'geometry_shapes',
        title: 'Figury geometryczne',
        description: 'Rozpoznawaj figury',
        emoji: '🔷',
        color: 'kangur-gradient-accent-violet',
        activeBg: 'bg-violet-500',
        sortOrder: 3000,
        enabled: true,
        subject: 'maths',
      },
    ];
    authMeMock.mockImplementation(() => new Promise<null>(() => undefined));
    logoutMock.mockResolvedValue(undefined);
  });

  it('renders the Sprycio brand hero on the home screen', () => {
    renderGamePage();

    expect(screen.getByRole('heading', { name: 'Sprycio' })).toBeInTheDocument();
    expect(screen.queryByText('Fajny sposób na naukę matematyki!')).not.toBeInTheDocument();
    expect(screen.queryByText('MathBlast!')).not.toBeInTheDocument();
  });

  it('renders every home action as a featured glass CTA without pre-hovering any of them', () => {
    renderGamePage();

    expect(screen.getByTestId('kangur-home-actions-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist',
      'kangur-panel-shell'
    );
    const actionLabels = ['Lekcje', 'Grajmy!', 'Pojedynki', 'Kangur Matematyczny'];

    expect(screen.queryByText('Trening figur')).not.toBeInTheDocument();

    for (const label of actionLabels) {
      const action = screen
        .getAllByText(label)
        .map((node) => node.closest('a, button'))
        .find((node) => node?.classList.contains('home-action-featured'));

      expect(action).toHaveClass('home-action-featured');
      expect(action).not.toHaveClass('home-action-active');
      expect(action?.parentElement).toHaveClass('home-action-featured-shell');
    }
  });

  it('keeps the Lekcje-style top section on every primary game entry screen', async () => {
    renderGamePage();

    fireEvent.click(getFeaturedHomeAction('Grajmy!'));
    expect(await screen.findByRole('heading', { name: 'Grajmy!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-operation-top-section')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-game-training-top-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));
    expect(await screen.findByTestId('kangur-home-actions-shell')).toBeInTheDocument();

    fireEvent.click(getFeaturedHomeAction('Kangur Matematyczny'));
    const kangurSetupTopSection = await screen.findByTestId('kangur-game-kangur-setup-top-section');
    expect(kangurSetupTopSection).toBeInTheDocument();
    expect(
      within(kangurSetupTopSection).getByRole('heading', {
        name: 'Konfiguracja sesji Kangura Matematycznego',
      })
    ).toBeInTheDocument();
  });

  it('keeps the same back-navigation pattern for quick-practice screens inside Grajmy', async () => {
    renderGamePage();

    fireEvent.click(getFeaturedHomeAction('Grajmy!'));
    expect(await screen.findByRole('heading', { name: 'Grajmy!' })).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('kangur-quick-practice-card-calendar_quiz'));
    expect(await screen.findByTestId('kangur-calendar-training-top-section')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-calendar-training-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));
    expect(await screen.findByRole('heading', { name: 'Grajmy!' })).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('kangur-quick-practice-card-geometry_quiz'));
    expect(await screen.findByTestId('kangur-geometry-training-top-section')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-geometry-training-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));
    expect(await screen.findByRole('heading', { name: 'Grajmy!' })).toBeInTheDocument();
  });
});

/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor, within } from '@/__tests__/test-utils';
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
}));

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

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({
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
  }),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
      redirectToLogin: redirectToLoginMock,
      logout: logoutMock,
    },
    score: {
      create: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      top: vi.fn().mockResolvedValue([]),
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

describe('Game delegated quick starts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'guest',
    });
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    authMeMock.mockResolvedValue(null);
    logoutMock.mockResolvedValue(undefined);
  });

  it('starts delegated mixed training directly from the quick-start url', async () => {
    window.history.replaceState(
      {},
      '',
      '/kangur/game?quickStart=training&categories=addition,division,decimals&count=10&difficulty=medium'
    );

    renderGamePage();

    expect(await screen.findByTestId('kangur-game-question-anchor')).toBeInTheDocument();
    expect(screen.queryByTestId('training-setup')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/kangur/game');
      expect(window.location.search).toBe('');
    });
  });

  it('opens the training setup from a bare training quick-start url and clears query params', async () => {
    window.history.replaceState({}, '', '/kangur/game?quickStart=training');

    renderGamePage();

    expect(await screen.findByTestId('kangur-game-operation-top-section')).toBeInTheDocument();
    expect(await screen.findByTestId('kangur-game-training-top-section')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Konfiguracja treningu' })[0]).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/kangur/game');
      expect(window.location.search).toBe('');
    });

    fireEvent.click(
      within(screen.getByTestId('kangur-game-operation-top-section')).getByRole('button', {
        name: 'Wróć do poprzedniej strony',
      })
    );

    expect(await screen.findByTestId('kangur-home-actions-shell')).toBeInTheDocument();
  });

  it('opens the operation setup from a bare operation quick-start url and clears query params', async () => {
    window.history.replaceState({}, '', '/kangur/game?quickStart=operation');

    renderGamePage();

    expect(await screen.findByTestId('kangur-game-operation-top-section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wybor rodzaju gry' })).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.pathname).toBe('/kangur/game');
      expect(window.location.search).toBe('');
    });

    fireEvent.click(
      within(screen.getByTestId('kangur-game-operation-top-section')).getByRole('button', {
        name: 'Wróć do poprzedniej strony',
      })
    );

    expect(await screen.findByTestId('kangur-home-actions-shell')).toBeInTheDocument();
  });
});

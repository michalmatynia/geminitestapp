/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withKangurClientError,
  withKangurClientErrorSync,
  useKangurAuthMock,
  useKangurDeferredStandaloneHomeReadyMock,
  useKangurRoutingMock,
  useKangurAssignmentsMock,
  useKangurProgressStateMock,
  useKangurSubjectFocusMock,
  scoreCreateMock,
} = vi.hoisted(() => ({
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  useKangurAuthMock: vi.fn(),
  useKangurDeferredStandaloneHomeReadyMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  scoreCreateMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useKangurAuthSessionState: () => {
    const auth = useKangurAuthMock();
    return {
      user: auth.user ?? null,
      isAuthenticated: auth.isAuthenticated ?? false,
      hasResolvedAuth: auth.hasResolvedAuth ?? true,
      canAccessParentAssignments: auth.canAccessParentAssignments ?? false,
    };
  },
  useKangurAuthStatusState: () => {
    const auth = useKangurAuthMock();
    return {
      isLoadingAuth: auth.isLoadingAuth ?? false,
      isLoadingPublicSettings: auth.isLoadingPublicSettings ?? false,
      isLoggingOut: auth.isLoggingOut ?? false,
      authError: auth.authError ?? null,
      appPublicSettings: auth.appPublicSettings ?? null,
    };
  },
  useKangurAuthActions: () => {
    const auth = useKangurAuthMock();
    return {
      logout: auth.logout ?? vi.fn(),
      navigateToLogin: auth.navigateToLogin ?? vi.fn(),
      checkAppState: auth.checkAppState ?? vi.fn(),
      selectLearner: auth.selectLearner ?? vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady', () => ({
  useKangurDeferredStandaloneHomeReady: useKangurDeferredStandaloneHomeReadyMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: vi.fn(),
  withKangurClientError,
  withKangurClientErrorSync,
}));

import {
  KangurGameRuntimeProvider,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

const RuntimeProbe = (): React.JSX.Element => {
  const {
    canStartFromHome,
    handleStartGame,
    launchableGameInstanceId,
    playerName,
    screen,
  } = useKangurGameRuntime();

  return (
    <div>
      <div data-testid='kangur-game-can-start'>{String(canStartFromHome)}</div>
      <div data-testid='kangur-game-screen'>{screen}</div>
      <div data-testid='kangur-game-instance-id'>{launchableGameInstanceId ?? 'none'}</div>
      <div data-testid='kangur-game-player-name'>{playerName}</div>
      <button type='button' onClick={handleStartGame}>
        Start game
      </button>
    </div>
  );
};

describe('KangurGameRuntimeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/kangur/game');
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
    });
    useKangurDeferredStandaloneHomeReadyMock.mockReturnValue(true);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
    });
    useKangurAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      canAccessParentAssignments: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      refresh: vi.fn(),
    });
    useKangurProgressStateMock.mockReturnValue({
      totalXp: 0,
      currentLevel: 1,
      xpToNextLevel: 100,
      badges: [],
      gamesPlayed: 0,
      perfectGames: 0,
      operationsPlayed: [],
      lessonsCompleted: 0,
      lessonMastery: {},
      activityStreak: 0,
      lastActivityDate: null,
    });
    scoreCreateMock.mockResolvedValue(null);
  });

  it('defers delegated assignments until the standalone home idle gate is ready', () => {
    useKangurAuthMock.mockReturnValue({
      user: {
        actorType: 'parent',
        activeLearner: { id: 'learner-1' },
      },
      isAuthenticated: true,
      isLoadingAuth: false,
      canAccessParentAssignments: true,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
    });
    useKangurDeferredStandaloneHomeReadyMock.mockReturnValue(false);

    const { rerender } = render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    expect(useKangurAssignmentsMock).toHaveBeenLastCalledWith({
      enabled: false,
      query: {
        includeArchived: false,
      },
    });

    useKangurDeferredStandaloneHomeReadyMock.mockReturnValue(true);

    rerender(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    expect(useKangurAssignmentsMock).toHaveBeenLastCalledWith({
      enabled: true,
      query: {
        includeArchived: false,
      },
    });
  });

  it('keeps home game actions available in anonymous mode', () => {
    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    expect(screen.getByTestId('kangur-game-can-start')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('home');
  });

  it('assigns a guest player name before entering the game flow anonymously', async () => {
    const user = userEvent.setup();

    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start game' }));

    await waitFor(() => {
      expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('operation');
      expect(screen.getByTestId('kangur-game-player-name')).toHaveTextContent('Gracz');
    });
  });

  it('applies launchable screen quick starts from the URL and clears the address bar', async () => {
    window.history.replaceState(
      {},
      '',
      '/kangur/game?quickStart=screen&screen=multiplication_array_quiz'
    );

    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(
        'multiplication_array_quiz'
      );
    });
    expect(screen.getByTestId('kangur-game-player-name')).toHaveTextContent('Gracz');
    expect(window.location.search).toBe('');
    expect(
      window.sessionStorage.getItem('kangur:game:pending-quick-start')
    ).not.toBeNull();
  });

  it('replays pending quick starts after a clean remount path', async () => {
    window.history.replaceState({}, '', '/en/kangur/game');
    window.sessionStorage.setItem(
      'kangur:game:pending-quick-start',
      JSON.stringify({
        createdAt: Date.now(),
        quickStart: 'screen',
        screen: 'multiplication_array_quiz',
      })
    );

    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(
        'multiplication_array_quiz'
      );
    });
    expect(window.location.pathname).toBe('/en/kangur/game');
    expect(
      window.sessionStorage.getItem('kangur:game:pending-quick-start')
    ).not.toBeNull();
  });

  it.each([
    {
      instanceId: 'adding_ball:instance:default',
      screen: 'addition_quiz',
    },
    {
      instanceId: 'adding_synthesis:instance:default',
      screen: 'adding_synthesis_quiz',
    },
    {
      instanceId: 'division_groups:instance:default',
      screen: 'division_quiz',
    },
    {
      instanceId: 'multiplication_array:instance:default',
      screen: 'multiplication_array_quiz',
    },
    {
      instanceId: 'subtracting_garden:instance:default',
      screen: 'subtraction_quiz',
    },
  ])(
    'keeps the $instanceId quick start on repeated remounts of the sanitized game route',
    async ({ instanceId, screen: quickStartScreen }) => {
      window.history.replaceState(
        {},
        '',
        `/en/kangur/game?quickStart=screen&screen=${quickStartScreen}&instanceId=${instanceId}`
      );

      const { unmount } = render(
        <KangurGuestPlayerProvider>
          <KangurGameRuntimeProvider>
            <RuntimeProbe />
          </KangurGameRuntimeProvider>
        </KangurGuestPlayerProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(quickStartScreen);
        expect(screen.getByTestId('kangur-game-instance-id')).toHaveTextContent(instanceId);
      });

      unmount();
      window.history.replaceState({}, '', '/en/kangur/game');

      render(
        <KangurGuestPlayerProvider>
          <KangurGameRuntimeProvider>
            <RuntimeProbe />
          </KangurGameRuntimeProvider>
        </KangurGuestPlayerProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(quickStartScreen);
        expect(screen.getByTestId('kangur-game-instance-id')).toHaveTextContent(instanceId);
      });
    }
  );

  it('keeps the root-owned adding synthesis quick start on repeated remounts of the sanitized game route', async () => {
    useKangurRoutingMock.mockReturnValue({
      basePath: '/',
    });
    window.history.replaceState(
      {},
      '',
      '/en/game?quickStart=screen&screen=adding_synthesis_quiz&instanceId=adding_synthesis:instance:default'
    );

    const { unmount } = render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(
        'adding_synthesis_quiz'
      );
      expect(screen.getByTestId('kangur-game-instance-id')).toHaveTextContent(
        'adding_synthesis:instance:default'
      );
    });

    unmount();
    window.history.replaceState({}, '', '/en/game');

    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent(
        'adding_synthesis_quiz'
      );
      expect(screen.getByTestId('kangur-game-instance-id')).toHaveTextContent(
        'adding_synthesis:instance:default'
      );
    });
  });
});

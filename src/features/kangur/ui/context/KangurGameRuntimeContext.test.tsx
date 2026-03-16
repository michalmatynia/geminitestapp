/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurAuthMock,
  useKangurRoutingMock,
  useKangurAssignmentsMock,
  useKangurProgressStateMock,
  useKangurSubjectFocusMock,
  scoreCreateMock,
} = vi.hoisted(() => ({
  useKangurAuthMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  scoreCreateMock: vi.fn(),
}));

type KangurClientErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

const withKangurClientError = async <T,>(
  _report: unknown,
  task: () => Promise<T>,
  options: KangurClientErrorHandlingOptions<T>
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

const withKangurClientErrorSync = <T,>(
  _report: unknown,
  task: () => T,
  options: KangurClientErrorHandlingOptions<T>
): T => {
  try {
    return task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
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
  const { canStartFromHome, handleStartGame, playerName, screen } = useKangurGameRuntime();

  return (
    <div>
      <div data-testid='kangur-game-can-start'>{String(canStartFromHome)}</div>
      <div data-testid='kangur-game-screen'>{screen}</div>
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
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
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
});

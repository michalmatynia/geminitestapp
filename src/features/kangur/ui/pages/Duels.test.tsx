/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsMock,
  lobbyChatMock,
  platformMock,
  trackKangurClientEventMock,
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
  authState,
  guestState,
  openLoginModalMock,
} = vi.hoisted(() => {
  const duels = {
    create: vi.fn(),
    join: vi.fn(),
    state: vi.fn(),
    heartbeat: vi.fn(),
    lobby: vi.fn(),
    lobbyPresence: vi.fn(),
    lobbyPresencePing: vi.fn(),
    recentOpponents: vi.fn(),
    search: vi.fn(),
    leaderboard: vi.fn(),
    answer: vi.fn(),
    leave: vi.fn(),
    reaction: vi.fn(),
    spectate: vi.fn(),
  };
  const lobbyChat = {
    list: vi.fn(),
    send: vi.fn(),
  };
  const trackKangurClientEventMock = vi.fn();
  const logKangurClientErrorMock = vi.fn();
  const reportKangurClientErrorMock = vi.fn();

  const withKangurClientError = async <T,>(
    report: unknown,
    task: () => Promise<T>,
    options: {
      fallback: T | (() => T);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        reportKangurClientErrorMock(error, report);
        logKangurClientErrorMock(error);
      }
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
    report: unknown,
    task: () => T,
    options: {
      fallback: T | (() => T);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ): T => {
    try {
      return task();
    } catch (error) {
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        reportKangurClientErrorMock(error, report);
        logKangurClientErrorMock(error);
      }
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => T)()
        : options.fallback;
    }
  };

  return {
    duelsMock: duels,
    lobbyChatMock: lobbyChat,
    platformMock: { duels, lobbyChat },
    trackKangurClientEventMock,
    logKangurClientErrorMock,
    reportKangurClientErrorMock,
    withKangurClientError,
    withKangurClientErrorSync,
    authState: {
      user: null as unknown,
      isAuthenticated: false,
      canAccessParentAssignments: false,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      checkAppState: vi.fn(),
      selectLearner: vi.fn(),
    },
    guestState: {
      guestPlayerName: '',
      setGuestPlayerName: vi.fn(),
    },
    openLoginModalMock: vi.fn(),
  };
});

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => platformMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState,
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => guestState,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({ openLoginModal: openLoginModalMock }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
  }),
  useOptionalKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='kangur-top-navigation' />,
}));

vi.mock('@/features/kangur/ui/components/DuelsLobbyPanels', () => ({
  DuelsLobbyPanels: () => <div data-testid='duels-lobby-panels' />,
}));

vi.mock('@/features/kangur/ui/components/DuelsLobbyChatPanel', () => ({
  DuelsLobbyChatPanel: () => <div data-testid='duels-lobby-chat' />,
}));

vi.mock('@/features/kangur/ui/components/QuestionCard', () => ({
  __esModule: true,
  default: () => <div data-testid='question-card' />,
}));

import Duels from '@/features/kangur/ui/pages/Duels';

const buildSession = () => ({
  id: 'duel-1',
  mode: 'challenge' as const,
  visibility: 'public' as const,
  operation: 'addition' as const,
  difficulty: 'easy' as const,
  status: 'in_progress' as const,
  createdAt: '2026-03-16T10:00:00.000Z',
  updatedAt: '2026-03-16T12:00:00.000Z',
  startedAt: '2026-03-16T12:00:00.000Z',
  endedAt: null,
  invitedLearnerId: null,
  invitedLearnerName: null,
  questionCount: 3,
  timePerQuestionSec: 20,
  currentQuestionIndex: 0,
  questions: [
    { id: 'q-1', prompt: '1+1', choices: [2, 3] },
    { id: 'q-2', prompt: '2+2', choices: [3, 4] },
    { id: 'q-3', prompt: '3+3', choices: [5, 6] },
  ],
  players: [
    {
      learnerId: 'learner-1',
      displayName: 'Ada',
      status: 'playing' as const,
      score: 2,
      joinedAt: '2026-03-16T10:00:00.000Z',
      lastAnswerAt: null,
      lastAnswerQuestionId: null,
      lastAnswerCorrect: null,
      isConnected: true,
    },
    {
      learnerId: 'learner-2',
      displayName: 'Olek',
      status: 'playing' as const,
      score: 1,
      joinedAt: '2026-03-16T10:00:00.000Z',
      lastAnswerAt: null,
      lastAnswerQuestionId: null,
      lastAnswerCorrect: null,
      isConnected: true,
    },
  ],
  series: null,
  spectatorCount: 2,
  recentReactions: [],
});

const buildUser = () =>
  ({
    id: 'user-1',
    full_name: 'Parent',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'learner',
    canManageLearners: true,
    ownerUserId: 'user-1',
    ownerEmailVerified: true,
    activeLearner: {
      id: 'learner-1',
      ownerUserId: 'user-1',
      displayName: 'Ada',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: null,
      aiTutor: null,
      createdAt: '2026-03-16T10:00:00.000Z',
      updatedAt: '2026-03-16T10:00:00.000Z',
    },
    learners: [
      {
        id: 'learner-1',
        ownerUserId: 'user-1',
        displayName: 'Ada',
        loginName: 'ada',
        status: 'active',
        legacyUserKey: null,
        aiTutor: null,
        createdAt: '2026-03-16T10:00:00.000Z',
        updatedAt: '2026-03-16T10:00:00.000Z',
      },
    ],
  }) as unknown;

describe('Duels page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', undefined);
    window.history.pushState({}, '', '/kangur/duels');
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => true,
    });
    duelsMock.lobby.mockResolvedValue({ entries: [], serverTime: '2026-03-16T12:00:00.000Z' });
    duelsMock.lobbyPresence.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.lobbyPresencePing.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.recentOpponents.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.search.mockResolvedValue({ entries: [], serverTime: '2026-03-16T12:00:00.000Z' });
    duelsMock.state.mockResolvedValue({
      session: buildSession(),
      player: buildSession().players[0],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.heartbeat.mockResolvedValue({
      session: buildSession(),
      player: buildSession().players[0],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.leaderboard.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    authState.user = null;
    authState.isAuthenticated = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/kangur/duels');
  });

  it('renders duel leaderboard entries', async () => {
    duelsMock.leaderboard.mockResolvedValue({
      entries: [
        {
          learnerId: 'leader-1',
          displayName: 'Ada',
          wins: 3,
          losses: 1,
          ties: 0,
          matches: 4,
          winRate: 0.75,
          lastPlayedAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    expect(await screen.findByText('Ranking pojedynków')).toBeInTheDocument();
    expect(await screen.findByText('1. Ada')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('sends selected operation and difficulty for quick match', async () => {
    authState.user = buildUser();
    authState.isAuthenticated = true;

    const session = buildSession();
    duelsMock.join.mockResolvedValue({
      session,
      player: session.players[0],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    const operationButton = await screen.findByRole('button', { name: /Dzielenie/ });
    fireEvent.click(operationButton);
    fireEvent.click(screen.getByRole('button', { name: /Trudny/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Szybki pojedynek' }));

    await waitFor(() => {
      expect(duelsMock.join).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'quick_match',
          operation: 'division',
          difficulty: 'hard',
        })
      );
    });
  });

  it('renders lobby presence panel with active learners', async () => {
    authState.user = buildUser();
    authState.isAuthenticated = true;
    duelsMock.lobbyPresence.mockResolvedValue({
      entries: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.lobbyPresencePing.mockResolvedValue({
      entries: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: '2026-03-16T12:00:00.000Z',
        },
      ],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    expect(await screen.findByText('Uczniowie w lobby')).toBeInTheDocument();
    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('does not show lobby presence panel for guests', async () => {
    render(<Duels />);

    await waitFor(() => {
      expect(screen.queryByText('Uczniowie w lobby')).not.toBeInTheDocument();
    });
  });

  it('refreshes the leaderboard when clicking the refresh button', async () => {
    duelsMock.leaderboard.mockResolvedValueOnce({
      entries: [],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    const refreshButton = await screen.findByRole('button', { name: 'Odśwież' });
    const initialCalls = duelsMock.leaderboard.mock.calls.length;
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(duelsMock.leaderboard.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('shows spectator panel when spectate query is present', async () => {
    window.history.pushState({}, '', '/kangur/duels?spectate=duel-1');
    duelsMock.spectate.mockResolvedValue({
      session: {
        ...buildSession(),
        status: 'in_progress',
        spectatorCount: 3,
        recentReactions: [
          {
            id: 'reaction-1',
            learnerId: 'learner-1',
            displayName: 'Ada',
            type: 'cheer',
            createdAt: '2026-03-16T12:00:00.000Z',
          },
        ],
      },
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    expect(await screen.findByText('Podgląd pojedynku')).toBeInTheDocument();
    expect(await screen.findByText('👀 3')).toBeInTheDocument();
    await waitFor(() => {
      expect(duelsMock.spectate).toHaveBeenCalledWith(
        'duel-1',
        expect.objectContaining({ spectatorId: expect.any(String) })
      );
    });
  });

  it('shows reaction buttons for an active session and sends reactions', async () => {
    window.history.pushState({}, '', '/kangur/duels?join=duel-1');
    authState.user = buildUser();
    authState.isAuthenticated = true;

    const session = buildSession();
    duelsMock.join.mockResolvedValue({
      session,
      player: session.players[0],
      serverTime: '2026-03-16T12:00:00.000Z',
    });
    duelsMock.reaction.mockResolvedValue({
      reaction: {
        id: 'reaction-1',
        learnerId: 'learner-1',
        displayName: 'Ada',
        type: 'cheer',
        createdAt: '2026-03-16T12:00:00.000Z',
      },
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    expect(await screen.findByText('Reakcje:')).toBeInTheDocument();
    const reactionButton = await screen.findByLabelText('Brawa');
    fireEvent.click(reactionButton);

    await waitFor(() => {
      expect(duelsMock.reaction).toHaveBeenCalledWith({
        sessionId: 'duel-1',
        type: 'cheer',
      });
    });
  });

  it('copies the spectate link for public duels', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    window.history.pushState({}, '', '/kangur/duels?join=duel-1');
    authState.user = buildUser();
    authState.isAuthenticated = true;

    const session = buildSession();
    duelsMock.join.mockResolvedValue({
      session,
      player: session.players[0],
      serverTime: '2026-03-16T12:00:00.000Z',
    });

    render(<Duels />);

    const shareButton = await screen.findByRole('button', { name: 'Udostępnij podgląd' });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
  });
});

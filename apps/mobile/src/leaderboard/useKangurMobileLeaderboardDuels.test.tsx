/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createDuelMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  createDuelMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileHomeDuelsLeaderboardMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../home/useKangurMobileHomeDuelsLeaderboard', () => ({
  useKangurMobileHomeDuelsLeaderboard: useKangurMobileHomeDuelsLeaderboardMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileLeaderboardDuels', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
      entries: [
        {
          displayName: 'Maja Sprint',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 5,
          ties: 0,
          winRate: 0.8,
          wins: 4,
        },
        {
          displayName: 'Ada Learner',
          lastPlayedAt: '2026-03-21T08:07:00.000Z',
          learnerId: 'learner-1',
          losses: 2,
          matches: 5,
          ties: 0,
          winRate: 0.6,
          wins: 3,
        },
      ],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    createDuelMock.mockResolvedValue({
      player: {
        displayName: 'Ada Learner',
        learnerId: 'learner-1',
        status: 'ready',
        score: 0,
        bonusPoints: 0,
        currentQuestionIndex: 0,
        joinedAt: '2026-03-21T08:12:00.000Z',
      },
      serverTime: '2026-03-21T08:12:00.000Z',
      session: {
        createdAt: '2026-03-21T08:12:00.000Z',
        currentQuestionIndex: 0,
        difficulty: 'easy',
        id: 'duel-leaderboard-1',
        mode: 'challenge',
        operation: 'addition',
        players: [],
        questionCount: 5,
        questions: [],
        status: 'waiting',
        timePerQuestionSec: 15,
        updatedAt: '2026-03-21T08:12:00.000Z',
        visibility: 'private',
      },
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        createDuel: createDuelMock,
      },
    });

    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        source: 'native-learner-session',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          activeLearner: {
            id: 'learner-1',
          },
        },
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
  });

  it('maps the current learner into the duel leaderboard snapshot', () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileLeaderboardDuels(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.currentRank).toBe(2);
    expect(result.current.currentEntry?.displayName).toBe('Ada Learner');
  });

  it('creates a direct private challenge for a ranked learner', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileLeaderboardDuels(), {
      wrapper: createWrapper(queryClient),
    });

    let sessionId: string | null = null;
    await act(async () => {
      sessionId = await result.current.challengeLearner('leader-1');
    });

    expect(createDuelMock).toHaveBeenCalledWith(
      {
        difficulty: 'easy',
        mode: 'challenge',
        operation: 'addition',
        opponentLearnerId: 'leader-1',
        questionCount: 5,
        timePerQuestionSec: 15,
        visibility: 'private',
      },
      { cache: 'no-store' },
    );
    expect(sessionId).toBe('duel-leaderboard-1');
  });

  it('returns no current entry when the learner is outside the visible duel snapshot', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        source: 'native-learner-session',
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          activeLearner: {
            id: 'learner-99',
          },
        },
      },
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileLeaderboardDuels(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.currentRank).toBeNull();
    expect(result.current.currentEntry).toBeNull();
  });
});

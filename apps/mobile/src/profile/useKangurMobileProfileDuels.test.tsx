/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts';
import type {
  KangurAuthSession,
  KangurUser,
} from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createDuelMock,
  getDuelLeaderboardMock,
  listDuelOpponentsMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  createDuelMock: vi.fn(),
  getDuelLeaderboardMock: vi.fn(),
  listDuelOpponentsMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileProfileDuels } from './useKangurMobileProfileDuels';

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

const createActiveLearner = () => ({
  id: 'learner-1',
  ownerUserId: 'user-1',
  displayName: 'Ada Learner',
  loginName: 'ada',
  status: 'active' as const,
  legacyUserKey: null,
  aiTutor: createDefaultKangurAiTutorLearnerMood(),
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
});

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  id: 'user-1',
  full_name: 'Parent Demo',
  email: 'parent@example.com',
  role: 'user',
  actorType: 'parent',
  canManageLearners: true,
  ownerUserId: null,
  activeLearner: createActiveLearner(),
  learners: [],
  ...overrides,
});

const createSession = (user: KangurUser | null): KangurAuthSession => ({
  status: user ? 'authenticated' : 'anonymous',
  source: 'native-learner-session',
  user,
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
});

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileProfileDuels', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDuelLeaderboardMock.mockResolvedValue({
      entries: [
        {
          displayName: 'Ola Sprint',
          lastPlayedAt: '2026-03-21T08:08:00.000Z',
          learnerId: 'learner-2',
          losses: 1,
          matches: 4,
          ties: 0,
          winRate: 0.75,
          wins: 3,
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
      serverTime: '2026-03-21T08:09:00.000Z',
    });
    listDuelOpponentsMock.mockResolvedValue({
      entries: [
        {
          displayName: 'Leo Mentor',
          lastPlayedAt: '2026-03-21T08:05:00.000Z',
          learnerId: 'learner-3',
        },
        {
          displayName: 'Maja Sprint',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'learner-4',
        },
      ],
      serverTime: '2026-03-21T08:11:00.000Z',
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
        id: 'duel-profile-1',
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
        getDuelLeaderboard: getDuelLeaderboardMock,
        listDuelOpponents: listDuelOpponentsMock,
      },
    });

    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(createUser()),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
  });

  it('returns duel rank plus recent opponents and creates a private rematch', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileProfileDuels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.currentEntry?.learnerId).toBe('learner-1');
    });

    expect(result.current.currentRank).toBe(2);
    expect(result.current.opponents.map((entry) => entry.learnerId)).toEqual([
      'learner-4',
      'learner-3',
    ]);

    let sessionId: string | null = null;
    await act(async () => {
      sessionId = await result.current.createRematch('learner-3');
    });

    expect(createDuelMock).toHaveBeenCalledWith(
      {
        difficulty: 'easy',
        mode: 'challenge',
        operation: 'addition',
        opponentLearnerId: 'learner-3',
        questionCount: 5,
        timePerQuestionSec: 15,
        visibility: 'private',
      },
      { cache: 'no-store' },
    );
    expect(sessionId).toBe('duel-profile-1');
  });

  it('stays in auth-restoring state until learner auth is available', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: true,
      session: createSession(null),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileProfileDuels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    expect(result.current.isRestoringAuth).toBe(true);
    expect(result.current.currentEntry).toBeNull();
    expect(result.current.opponents).toEqual([]);
    expect(getDuelLeaderboardMock).not.toHaveBeenCalled();
    expect(listDuelOpponentsMock).not.toHaveBeenCalled();
  });
});

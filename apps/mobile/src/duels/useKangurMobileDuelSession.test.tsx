/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts/kangur-ai-tutor-mood';
import type { KangurDuelStateResponse } from '@kangur/contracts/kangur-duels';
import type {
  KangurAuthSession,
  KangurUser,
} from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  answerDuelMock,
  getDuelSpectatorStateMock,
  getDuelStateMock,
  heartbeatDuelMock,
  leaveDuelMock,
  reactToDuelMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  answerDuelMock: vi.fn(),
  getDuelSpectatorStateMock: vi.fn(),
  getDuelStateMock: vi.fn(),
  heartbeatDuelMock: vi.fn(),
  leaveDuelMock: vi.fn(),
  reactToDuelMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileDuelSession } from './useKangurMobileDuelSession';

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

const createPlayerStateResponse = (overrides?: {
  player?: Partial<KangurDuelStateResponse['player']>;
  session?: Partial<KangurDuelStateResponse['session']>;
}): KangurDuelStateResponse => {
  const baseResponse = {
    player: {
      displayName: 'Ada Learner',
      learnerId: 'learner-1',
      status: 'playing' as const,
      score: 3,
      bonusPoints: 0,
      currentQuestionIndex: 0,
      joinedAt: '2026-03-21T08:00:00.000Z',
    },
    serverTime: '2026-03-21T08:02:00.000Z',
    session: {
      createdAt: '2026-03-21T08:00:00.000Z',
      currentQuestionIndex: 0,
      difficulty: 'medium' as const,
      endedAt: null,
      id: 'duel-1',
      invitedLearnerId: null,
      invitedLearnerName: null,
      maxPlayers: 2,
      minPlayersToStart: 2,
      mode: 'challenge' as const,
      operation: 'addition' as const,
      players: [
        {
          displayName: 'Ada Learner',
          learnerId: 'learner-1',
          status: 'playing' as const,
          score: 3,
          bonusPoints: 0,
          currentQuestionIndex: 0,
          joinedAt: '2026-03-21T08:00:00.000Z',
        },
        {
          displayName: 'Leo Mentor',
          learnerId: 'learner-2',
          status: 'playing' as const,
          score: 2,
          bonusPoints: 0,
          currentQuestionIndex: 0,
          joinedAt: '2026-03-21T08:00:10.000Z',
        },
      ],
      questionCount: 5,
      questions: [
        {
          choices: [2, 3, 4],
          id: 'question-1',
          prompt: '1 + 1 = ?',
        },
      ],
      recentReactions: [],
      startedAt: '2026-03-21T08:01:00.000Z',
      status: 'in_progress' as const,
      timePerQuestionSec: 15,
      updatedAt: '2026-03-21T08:02:00.000Z',
      visibility: 'public' as const,
    },
  };

  return {
    ...baseResponse,
    player: {
      ...baseResponse.player,
      ...overrides?.player,
    },
    session: {
      ...baseResponse.session,
      ...overrides?.session,
    },
  };
};

const createWrapper =
  (queryClient: QueryClient, locale?: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>
        {locale ? (
          <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>
        ) : (
          children
        )}
      </QueryClientProvider>
    );

describe('useKangurMobileDuelSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDuelStateMock.mockResolvedValue(createPlayerStateResponse());
    getDuelSpectatorStateMock.mockResolvedValue({
      serverTime: '2026-03-21T08:02:00.000Z',
      session: {
        ...createPlayerStateResponse().session,
        id: 'duel-2',
        spectatorCount: 3,
      },
    });
    heartbeatDuelMock.mockResolvedValue(createPlayerStateResponse());
    leaveDuelMock.mockResolvedValue(createPlayerStateResponse());
    answerDuelMock.mockResolvedValue(createPlayerStateResponse());
    reactToDuelMock.mockResolvedValue({
      reaction: {
        createdAt: '2026-03-21T08:02:10.000Z',
        displayName: 'Ada Learner',
        id: 'reaction-1',
        learnerId: 'learner-1',
        type: 'cheer' as const,
      },
      serverTime: '2026-03-21T08:02:10.000Z',
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        answerDuel: answerDuelMock,
        getDuelSpectatorState: getDuelSpectatorStateMock,
        getDuelState: getDuelStateMock,
        heartbeatDuel: heartbeatDuelMock,
        leaveDuel: leaveDuelMock,
        reactToDuel: reactToDuelMock,
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

  it('loads participant duel state and updates recent reactions after sending one', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileDuelSession('duel-1'),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.session?.id).toBe('duel-1');
    });

    expect(getDuelStateMock).toHaveBeenCalledWith('duel-1', {
      cache: 'no-store',
    });
    expect(result.current.isSpectating).toBe(false);
    expect(result.current.player?.learnerId).toBe('learner-1');
    expect(result.current.currentQuestion?.prompt).toBe('1 + 1 = ?');

    await act(async () => {
      await result.current.sendReaction('cheer');
    });

    expect(reactToDuelMock).toHaveBeenCalledWith(
      {
        sessionId: 'duel-1',
        type: 'cheer',
      },
      {
        cache: 'no-store',
      },
    );
    expect(result.current.session?.recentReactions?.[0]?.id).toBe('reaction-1');
  });

  it('uses spectator state when spectate mode is enabled and does not answer questions', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(null),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileDuelSession('duel-2', { spectate: true }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.session?.id).toBe('duel-2');
    });

    expect(getDuelSpectatorStateMock).toHaveBeenCalledTimes(1);
    expect(getDuelStateMock).not.toHaveBeenCalled();
    expect(result.current.isSpectating).toBe(true);
    expect(result.current.player).toBeNull();
    expect(result.current.spectatorCount).toBe(3);
    expect(result.current.currentQuestion?.prompt).toBe('1 + 1 = ?');

    await act(async () => {
      await result.current.submitAnswer(2);
    });

    expect(answerDuelMock).not.toHaveBeenCalled();
  });

  it('localizes auth-required duel errors when the locale is de', async () => {
    getDuelStateMock.mockRejectedValueOnce({ status: 401 });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelSession('duel-401'), {
      wrapper: createWrapper(queryClient, 'de'),
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Melde dich an, um dieses Duell zu öffnen.',
      );
    });
  });

  it('localizes public-duel loading errors when spectator mode is enabled', async () => {
    getDuelSpectatorStateMock.mockRejectedValueOnce({ status: 500 });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileDuelSession('duel-spectator-error', { spectate: true }),
      {
        wrapper: createWrapper(queryClient, 'de'),
      },
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Das öffentliche Duell konnte nicht geladen werden.',
      );
    });
  });

  it('returns no active question when the tracked question index is past the duel length', async () => {
    getDuelStateMock.mockResolvedValueOnce(
      createPlayerStateResponse({
        player: {
          currentQuestionIndex: 1,
        },
        session: {
          currentQuestionIndex: 1,
          questionCount: 1,
        },
      }),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileDuelSession('duel-finished-question'),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.session?.id).toBe('duel-1');
    });

    expect(result.current.currentQuestion).toBeNull();
  });

  it('falls back to the generic duel-state message for network fetch failures', async () => {
    getDuelStateMock.mockRejectedValueOnce(new Error('Failed to fetch'));

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileDuelSession('duel-network-error'),
      {
        wrapper: createWrapper(queryClient, 'en'),
      },
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Could not load the duel state.');
    });
  });
});

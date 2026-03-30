/**
 * @vitest-environment jsdom
 */

import React from 'react';
import type { KangurAuthSession } from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listDuelLobbyMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  listDuelLobbyMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileHomeDuelsSpotlight } from './useKangurMobileHomeDuelsSpotlight';

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

const createSession = (): KangurAuthSession => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session',
  status: 'anonymous',
  user: null,
});

describe('useKangurMobileHomeDuelsSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listDuelLobbyMock.mockResolvedValue({
      entries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'hard',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 2,
            displayName: 'Maja Sprint',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-4',
            score: 4,
            status: 'playing',
          },
          mode: 'quick_match',
          operation: 'division',
          questionCount: 6,
          sessionId: 'public-live-1',
          status: 'in_progress',
          timePerQuestionSec: 12,
          updatedAt: '2026-03-21T08:09:00.000Z',
          visibility: 'public',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 0,
            displayName: 'Leo Mentor',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-2',
            score: 0,
            status: 'ready',
          },
          mode: 'challenge',
          operation: 'multiplication',
          questionCount: 5,
          sessionId: 'public-ready-1',
          status: 'ready',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:08:00.000Z',
          visibility: 'public',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'easy',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 0,
            displayName: 'Ada Quick',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-1',
            score: 0,
            status: 'ready',
          },
          mode: 'quick_match',
          operation: 'addition',
          questionCount: 5,
          sessionId: 'public-waiting-1',
          status: 'waiting',
          timePerQuestionSec: 10,
          updatedAt: '2026-03-21T08:07:00.000Z',
          visibility: 'public',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'hard',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 1,
            displayName: 'Olek Turbo',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-5',
            score: 3,
            status: 'playing',
          },
          mode: 'challenge',
          operation: 'subtraction',
          questionCount: 7,
          sessionId: 'public-live-2',
          status: 'in_progress',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:06:00.000Z',
          visibility: 'public',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 0,
            displayName: 'Private Invite',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-6',
            score: 0,
            status: 'ready',
          },
          mode: 'challenge',
          operation: 'addition',
          questionCount: 5,
          sessionId: 'private-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:10:00.000Z',
          visibility: 'private',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 4,
            displayName: 'Finished Match',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-7',
            score: 5,
            status: 'completed',
          },
          mode: 'challenge',
          operation: 'multiplication',
          questionCount: 5,
          sessionId: 'public-done-1',
          status: 'completed',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:11:00.000Z',
          visibility: 'public',
        },
      ],
      serverTime: '2026-03-21T08:12:00.000Z',
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listDuelLobby: listDuelLobbyMock,
      },
    });
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
  });

  it('returns public live and joinable duel entries ordered by urgency and recency', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileHomeDuelsSpotlight(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(4);
    });

    expect(listDuelLobbyMock).toHaveBeenCalledWith(
      { limit: 8, visibility: 'public' },
      { cache: 'no-store' },
    );
    expect(result.current.entries.map((entry) => entry.sessionId)).toEqual([
      'public-live-1',
      'public-live-2',
      'public-ready-1',
      'public-waiting-1',
    ]);
  });

  it('stays idle until deferred home duel panels are enabled', () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileHomeDuelsSpotlight({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.entries).toEqual([]);
    expect(listDuelLobbyMock).not.toHaveBeenCalled();
  });

  it('maps network failures to the shared api error copy', async () => {
    listDuelLobbyMock.mockRejectedValue(new Error('Failed to fetch'));

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileHomeDuelsSpotlight(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Nie udało się pobrać aktywnych pojedynków z lobby.');
    });
  });
});

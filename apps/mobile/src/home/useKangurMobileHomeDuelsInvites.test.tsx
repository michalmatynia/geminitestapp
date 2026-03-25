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

import { useKangurMobileHomeDuelsInvites } from './useKangurMobileHomeDuelsInvites';

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

describe('useKangurMobileHomeDuelsInvites', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listDuelLobbyMock.mockResolvedValue({
      entries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            displayName: 'Leo Mentor',
            learnerId: 'learner-2',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'challenge',
          operation: 'multiplication',
          questionCount: 5,
          sessionId: 'invite-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:05:00.000Z',
          visibility: 'private',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'easy',
          host: {
            displayName: 'Public Room',
            learnerId: 'learner-3',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'quick_match',
          operation: 'addition',
          questionCount: 5,
          sessionId: 'public-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:06:00.000Z',
          visibility: 'public',
        },
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'hard',
          host: {
            displayName: 'Ada Learner',
            learnerId: 'learner-1',
            status: 'ready',
            score: 0,
            bonusPoints: 0,
            currentQuestionIndex: 0,
            joinedAt: '2026-03-21T08:00:00.000Z',
          },
          mode: 'challenge',
          operation: 'division',
          questionCount: 8,
          sessionId: 'outgoing-1',
          status: 'waiting',
          timePerQuestionSec: 20,
          updatedAt: '2026-03-21T08:07:00.000Z',
          visibility: 'private',
        },
      ],
      serverTime: '2026-03-21T08:08:00.000Z',
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
      session: createSession(createUser()),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });
  });

  it('returns only private invites sorted by most recent update', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileHomeDuelsInvites(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.invites).toHaveLength(1);
    });

    expect(listDuelLobbyMock).toHaveBeenCalledWith(
      { limit: 8, visibility: 'private' },
      { cache: 'no-store' },
    );
    expect(result.current.invites.map((entry) => entry.sessionId)).toEqual(['invite-1']);
    expect(result.current.outgoingChallenges.map((entry) => entry.sessionId)).toEqual([
      'outgoing-1',
    ]);
    expect(result.current.isAuthenticated).toBe(true);
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
    const { result } = renderHook(() => useKangurMobileHomeDuelsInvites(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    expect(result.current.isRestoringAuth).toBe(true);
    expect(result.current.invites).toEqual([]);
    expect(result.current.outgoingChallenges).toEqual([]);
    expect(listDuelLobbyMock).not.toHaveBeenCalled();
  });

  it('does not start the lobby query until the home duel panels are enabled', () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileHomeDuelsInvites({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.invites).toEqual([]);
    expect(result.current.outgoingChallenges).toEqual([]);
    expect(listDuelLobbyMock).not.toHaveBeenCalled();
  });
});

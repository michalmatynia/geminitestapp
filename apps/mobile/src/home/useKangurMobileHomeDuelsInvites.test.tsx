/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts/kangur-ai-tutor-mood';
import type {
  KangurAuthSession,
  KangurClientStorageAdapter,
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

const createStorage = (
  initialValues: Record<string, string> = {},
): KangurClientStorageAdapter => {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    subscribe: vi.fn(() => () => {}),
  };
};

const incomingInviteEntry = {
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
} as const;

const publicLobbyEntry = {
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
} as const;

const outgoingInviteEntry = {
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
} as const;

const persistedDeferredInvitesPayload = {
  'learner-1': [incomingInviteEntry],
};

const persistedDeferredInvitesJson = JSON.stringify(
  persistedDeferredInvitesPayload,
);

const persistedLiveInvitesPayload = {
  'learner-1': [outgoingInviteEntry, incomingInviteEntry],
};

describe('useKangurMobileHomeDuelsInvites', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listDuelLobbyMock.mockResolvedValue({
      entries: [incomingInviteEntry, publicLobbyEntry, outgoingInviteEntry],
      serverTime: '2026-03-21T08:08:00.000Z',
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listDuelLobby: listDuelLobbyMock,
      },
      storage: createStorage(),
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
    expect(result.current.isDeferred).toBe(false);
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

  it('hydrates persisted private invites while the live duel refresh is still deferred', () => {
    const storage = createStorage({
      'kangur.mobile.home.duels.privateLobby': persistedDeferredInvitesJson,
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listDuelLobby: listDuelLobbyMock,
      },
      storage,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileHomeDuelsInvites({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDeferred).toBe(true);
    expect(result.current.invites.map((entry) => entry.sessionId)).toEqual(['invite-1']);
    expect(result.current.outgoingChallenges).toEqual([]);
    expect(listDuelLobbyMock).not.toHaveBeenCalled();
  });

  it('persists the resolved private lobby snapshot after a live refresh', async () => {
    const storage = createStorage();
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listDuelLobby: listDuelLobbyMock,
      },
      storage,
    });

    const queryClient = createQueryClient();
    renderHook(() => useKangurMobileHomeDuelsInvites(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(storage.setItem).toHaveBeenCalledWith(
        'kangur.mobile.home.duels.privateLobby',
        expect.any(String),
      );
    });

    const persistedStoreRaw = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(JSON.parse(persistedStoreRaw)).toEqual(persistedLiveInvitesPayload);
  });
});

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import {
  createDefaultKangurAiTutorLearnerMood,
  createDefaultKangurProgressState,
  type KangurScore,
} from '@kangur/contracts';
import type {
  KangurAuthSession,
  KangurClientStorageAdapter,
  KangurUser,
} from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listScoresMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  listScoresMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileRecentResults } from './useKangurMobileRecentResults';

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

const createScore = (
  id: string,
  overrides: Partial<KangurScore> = {},
): KangurScore => ({
  id,
  player_name: 'Ada Learner',
  score: 7,
  operation: 'addition',
  subject: 'maths',
  total_questions: 8,
  correct_answers: 7,
  time_taken: 42,
  xp_earned: 14,
  created_date: '2026-03-22T08:00:00.000Z',
  client_mutation_id: null,
  created_by: 'parent@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'parent-1',
  ...overrides,
});

const cachedRecentResults = [
  createScore('score-cached-1', {
    created_date: '2026-03-22T08:00:00.000Z',
  }),
  createScore('score-cached-2', {
    created_date: '2026-03-21T08:00:00.000Z',
  }),
];

const liveRecentResults = [
  createScore('score-live-1', {
    created_date: '2026-03-23T08:00:00.000Z',
  }),
  createScore('score-live-2', {
    created_date: '2026-03-22T08:00:00.000Z',
  }),
];

const persistedRecentResultsStoragePayload = {
  'learner:learner-1': cachedRecentResults,
};

const updatedRecentResultsStoragePayload = {
  'learner:learner-1': liveRecentResults,
};

const persistedRecentResultsStorageJson = JSON.stringify(
  persistedRecentResultsStoragePayload,
);

const updatedRecentResultsStorageJson = JSON.stringify(
  updatedRecentResultsStoragePayload,
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

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileRecentResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const progressSnapshot = createDefaultKangurProgressState();
    listScoresMock.mockResolvedValue([]);

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listScores: listScoresMock,
      },
      defaultDailyGoalGames: 5,
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
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

  it('queries recent results by learner id for authenticated learner sessions', async () => {
    const queryClient = createQueryClient();

    listScoresMock.mockResolvedValue([
      createScore('score-1'),
      createScore('score-2', {
        created_date: '2026-03-21T08:00:00.000Z',
      }),
      createScore('score-3', {
        created_date: '2026-03-20T08:00:00.000Z',
      }),
      createScore('score-4', {
        created_date: '2026-03-19T08:00:00.000Z',
      }),
    ]);

    const { result } = renderHook(() => useKangurMobileRecentResults(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(listScoresMock).toHaveBeenCalledWith(
        {
          learner_id: 'learner-1',
          sort: '-created_date',
          limit: 3,
        },
        {
          cache: 'no-store',
        },
      );
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(3);
    });
  });

  it('hydrates persisted recent results while the live score request is still pending', async () => {
    let resolveScores: ((scores: KangurScore[]) => void) | undefined;
    listScoresMock.mockImplementation(
      () =>
        new Promise<KangurScore[]>((resolve) => {
          resolveScores = resolve;
        }),
    );

    const storage = createStorage({
      'kangur.mobile.scores.recent': persistedRecentResultsStorageJson,
    });
    const progressSnapshot = createDefaultKangurProgressState();
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listScores: listScoresMock,
      },
      defaultDailyGoalGames: 5,
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
      storage,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileRecentResults(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(cachedRecentResults);
    });

    expect(result.current.isLoading).toBe(false);

    if (resolveScores) {
      resolveScores(liveRecentResults);
    }

    await waitFor(() => {
      expect(result.current.results).toEqual(liveRecentResults);
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      'kangur.mobile.scores.recent',
      updatedRecentResultsStorageJson,
    );
  });

  it('does not query recent results while the user is anonymous', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(null),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileRecentResults(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(false);
    });
    expect(listScoresMock).not.toHaveBeenCalled();
  });

  it('keeps the results slice in a restoring state while learner auth is still loading', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: true,
      session: createSession(null),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileRecentResults(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isRestoringAuth).toBe(true);
    expect(listScoresMock).not.toHaveBeenCalled();
  });

  it('reuses persisted recent results while the home screen keeps the live query deferred', async () => {
    const storage = createStorage({
      'kangur.mobile.scores.recent': persistedRecentResultsStorageJson,
    });
    const progressSnapshot = createDefaultKangurProgressState();
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listScores: listScoresMock,
      },
      defaultDailyGoalGames: 5,
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
      storage,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileRecentResults({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results).toEqual(cachedRecentResults);
    });
    expect(listScoresMock).not.toHaveBeenCalled();
  });
});

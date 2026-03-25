/**
 * @vitest-environment jsdom
 */

import React from 'react';
import type { KangurScore } from '@kangur/contracts';
import { createDefaultKangurAiTutorLearnerMood, createDefaultKangurProgressState } from '@kangur/contracts';
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

import { useKangurMobileTrainingFocus } from './useKangurMobileTrainingFocus';

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

const createScore = (overrides: Partial<KangurScore> = {}): KangurScore => ({
  id: 'score-1',
  player_name: 'Ada Learner',
  score: 6,
  operation: 'addition',
  subject: 'maths',
  total_questions: 8,
  correct_answers: 6,
  time_taken: 42,
  created_date: '2026-03-20T12:00:00.000Z',
  created_by: 'user-1',
  learner_id: 'learner-1',
  owner_user_id: 'user-1',
  ...overrides,
});

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileTrainingFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const progressSnapshot = createDefaultKangurProgressState();
    listScoresMock.mockResolvedValue([
      createScore({
        id: 'score-1',
        operation: 'logical_patterns',
        correct_answers: 8,
        score: 8,
      }),
      createScore({
        id: 'score-2',
        operation: 'addition',
        correct_answers: 4,
        score: 4,
      }),
      createScore({
        id: 'score-3',
        operation: 'multiplication',
        correct_answers: 6,
        score: 6,
      }),
    ]);

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

  it('derives strongest and weakest operations from learner score history', async () => {
    const storage = createStorage();
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
    const { result } = renderHook(() => useKangurMobileTrainingFocus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.strongestOperation?.operation).toBe(
        'logical_patterns',
      );
    });

    expect(listScoresMock).toHaveBeenCalledWith(
      {
        learner_id: 'learner-1',
        sort: '-created_date',
        limit: 40,
      },
      {
        cache: 'no-store',
      },
    );
    expect(result.current.strongestLessonFocus).toBe('logical_patterns');
    expect(result.current.weakestOperation?.operation).toBe('addition');
    expect(result.current.weakestLessonFocus).toBe('adding');
    expect(result.current.recentResults).toEqual([
      createScore({
        id: 'score-1',
        operation: 'logical_patterns',
        correct_answers: 8,
        score: 8,
      }),
      createScore({
        id: 'score-2',
        operation: 'addition',
        correct_answers: 4,
        score: 4,
      }),
      createScore({
        id: 'score-3',
        operation: 'multiplication',
        correct_answers: 6,
        score: 6,
      }),
    ]);
    expect(storage.setItem).toHaveBeenCalledWith(
      'kangur.mobile.scores.trainingFocus',
      JSON.stringify({
        'learner:learner-1': {
          strongestOperation: {
            averageAccuracyPercent: 100,
            bestAccuracyPercent: 100,
            family: 'logic',
            operation: 'logical_patterns',
            sessions: 1,
          },
          weakestOperation: {
            averageAccuracyPercent: 50,
            bestAccuracyPercent: 50,
            family: 'arithmetic',
            operation: 'addition',
            sessions: 1,
          },
        },
      }),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      'kangur.mobile.scores.recent',
      JSON.stringify({
        'learner:learner-1': [
          createScore({
            id: 'score-1',
            operation: 'logical_patterns',
            correct_answers: 8,
            score: 8,
          }),
          createScore({
            id: 'score-2',
            operation: 'addition',
            correct_answers: 4,
            score: 4,
          }),
          createScore({
            id: 'score-3',
            operation: 'multiplication',
            correct_answers: 6,
            score: 6,
          }),
        ],
      }),
    );
  });

  it('stays in a restoring state while learner auth is still loading', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: true,
      session: createSession(null),
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileTrainingFocus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isRestoringAuth).toBe(true);
    expect(listScoresMock).not.toHaveBeenCalled();
  });

  it('does not query score history until the deferred home panel is enabled', () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useKangurMobileTrainingFocus({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.recentResults).toEqual([]);
    expect(result.current.strongestOperation).toBeNull();
    expect(result.current.weakestOperation).toBeNull();
    expect(listScoresMock).not.toHaveBeenCalled();
  });

  it('hydrates persisted focus while the heavier score analysis is still deferred', () => {
    const storage = createStorage({
      'kangur.mobile.scores.trainingFocus': JSON.stringify({
        'learner:learner-1': {
          strongestOperation: {
            averageAccuracyPercent: 94,
            bestAccuracyPercent: 100,
            family: 'logic',
            operation: 'logical_patterns',
            sessions: 4,
          },
          weakestOperation: {
            averageAccuracyPercent: 52,
            bestAccuracyPercent: 63,
            family: 'arithmetic',
            operation: 'addition',
            sessions: 3,
          },
        },
      }),
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
      () => useKangurMobileTrainingFocus({ enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.recentResults).toEqual([]);
    expect(result.current.strongestOperation?.operation).toBe(
      'logical_patterns',
    );
    expect(result.current.strongestLessonFocus).toBe('logical_patterns');
    expect(result.current.weakestOperation?.operation).toBe('addition');
    expect(result.current.weakestLessonFocus).toBe('adding');
    expect(listScoresMock).not.toHaveBeenCalled();
  });
});

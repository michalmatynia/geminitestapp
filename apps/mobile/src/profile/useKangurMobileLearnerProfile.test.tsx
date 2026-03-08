/**
 * @vitest-environment jsdom
 */

import React from 'react';
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
  signInMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  listScoresMock: vi.fn(),
  signInMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileLearnerProfile } from './useKangurMobileLearnerProfile';

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

const createSession = (
  user: KangurUser | null,
  source: KangurAuthSession['source'] = 'native-learner-session',
): KangurAuthSession => ({
  status: user ? 'authenticated' : 'anonymous',
  source,
  user,
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
});

const createStorage = (): KangurClientStorageAdapter => ({
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  subscribe: vi.fn(() => () => {}),
});

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileLearnerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listScoresMock.mockResolvedValue([]);
    signInMock.mockResolvedValue(undefined);
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
      storage: createStorage(),
    });

    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(createUser()),
      signIn: signInMock,
      supportsLearnerCredentials: true,
    });
  });

  it('queries score history by learner id when an active learner session is available', async () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useKangurMobileLearnerProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(listScoresMock).toHaveBeenCalledWith(
        {
          learner_id: 'learner-1',
          sort: '-created_date',
          limit: 120,
        },
        {
          cache: 'no-store',
        },
      );
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('falls back to the normalized email query when there is no active learner', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(
        createUser({
          email: ' Parent@Example.com ',
          activeLearner: null,
        }),
      ),
      signIn: signInMock,
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();

    renderHook(() => useKangurMobileLearnerProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(listScoresMock).toHaveBeenCalledWith(
        {
          created_by: 'parent@example.com',
          sort: '-created_date',
          limit: 120,
        },
        {
          cache: 'no-store',
        },
      );
    });
  });

  it('does not query score history when the authenticated session has no score scope', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: false,
      session: createSession(
        createUser({
          email: null,
          actorType: 'learner',
          canManageLearners: false,
          ownerUserId: 'parent-1',
          activeLearner: null,
        }),
      ),
      signIn: signInMock,
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();

    const { result } = renderHook(() => useKangurMobileLearnerProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    expect(listScoresMock).not.toHaveBeenCalled();
  });

  it('keeps the profile in auth-loading state while learner session is restoring', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      isLoadingAuth: true,
      session: createSession(null),
      signIn: signInMock,
      supportsLearnerCredentials: true,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileLearnerProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoadingScores).toBe(true);
    expect(listScoresMock).not.toHaveBeenCalled();
  });
});

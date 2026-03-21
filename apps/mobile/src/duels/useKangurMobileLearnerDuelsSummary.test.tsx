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

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

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

import { useKangurMobileLearnerDuelsSummary } from './useKangurMobileLearnerDuelsSummary';

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

describe('useKangurMobileLearnerDuelsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDuelLeaderboardMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:09:00.000Z',
    });
    listDuelOpponentsMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:11:00.000Z',
    });
    createDuelMock.mockResolvedValue({
      session: {
        id: 'duel-summary-1',
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

  it('localizes German duel-summary auth errors for the profile/plan summary hook', async () => {
    getDuelLeaderboardMock.mockRejectedValueOnce({ status: 401 });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useKangurMobileLearnerDuelsSummary({
          leaderboardLimit: 6,
          leaderboardLookbackDays: 14,
          opponentsLimit: 3,
        }),
      {
        wrapper: createWrapper(queryClient, 'de'),
      },
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Melde eine Lernenden-Sitzung an, um Duellstatistiken zu laden.',
      );
    });
  });

  it('localizes German rematch action errors when private duel creation is unauthorized', async () => {
    createDuelMock.mockRejectedValueOnce({ status: 401 });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useKangurMobileLearnerDuelsSummary({
          leaderboardLimit: 6,
          leaderboardLookbackDays: 14,
          opponentsLimit: 3,
        }),
      {
        wrapper: createWrapper(queryClient, 'de'),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let sessionId: string | null = 'not-null';
    await act(async () => {
      sessionId = await result.current.createRematch('learner-2');
    });

    expect(sessionId).toBeNull();
    expect(result.current.actionError).toBe(
      'Melde eine Lernenden-Sitzung an, um ein privates Rückspiel zu senden.',
    );
    expect(result.current.pendingOpponentLearnerId).toBeNull();
  });
});

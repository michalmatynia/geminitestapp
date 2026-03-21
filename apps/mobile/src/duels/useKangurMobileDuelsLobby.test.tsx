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
  listDuelLobbyMock,
  listDuelOpponentsMock,
  pingDuelLobbyPresenceMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  createDuelMock: vi.fn(),
  getDuelLeaderboardMock: vi.fn(),
  listDuelLobbyMock: vi.fn(),
  listDuelOpponentsMock: vi.fn(),
  pingDuelLobbyPresenceMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileDuelsLobby } from './useKangurMobileDuelsLobby';

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

describe('useKangurMobileDuelsLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listDuelLobbyMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:00:00.000Z',
    });
    pingDuelLobbyPresenceMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:00:00.000Z',
    });
    listDuelOpponentsMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:00:00.000Z',
    });
    getDuelLeaderboardMock.mockResolvedValue({
      entries: [],
      serverTime: '2026-03-21T08:00:00.000Z',
    });
    createDuelMock.mockResolvedValue({
      session: {
        id: 'duel-created-1',
      },
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        createDuel: createDuelMock,
        getDuelLeaderboard: getDuelLeaderboardMock,
        listDuelLobby: listDuelLobbyMock,
        listDuelOpponents: listDuelOpponentsMock,
        pingDuelLobbyPresence: pingDuelLobbyPresenceMock,
        searchDuels: vi.fn(),
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

  it('creates a default public challenge as a single match', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelsLobby(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLobbyLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createPublicChallenge();
    });

    expect(createDuelMock).toHaveBeenCalledWith(
      {
        difficulty: 'easy',
        mode: 'challenge',
        operation: 'addition',
        questionCount: 5,
        timePerQuestionSec: 15,
        visibility: 'public',
      },
      { cache: 'no-store' },
    );
  });

  it('uses explicit overrides when creating a private rematch challenge', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelsLobby(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLobbyLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createPrivateChallenge('learner-2', {
        difficulty: 'hard',
        operation: 'division',
        seriesBestOf: 5,
      });
    });

    expect(createDuelMock).toHaveBeenCalledWith(
      {
        difficulty: 'hard',
        mode: 'challenge',
        opponentLearnerId: 'learner-2',
        operation: 'division',
        questionCount: 5,
        seriesBestOf: 5,
        timePerQuestionSec: 15,
        visibility: 'private',
      },
      { cache: 'no-store' },
    );
  });

  it('localizes lobby auth errors when the locale is de', async () => {
    listDuelLobbyMock.mockRejectedValueOnce({ status: 401 });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelsLobby(), {
      wrapper: createWrapper(queryClient, 'de'),
    });

    await waitFor(() => {
      expect(result.current.lobbyError).toBe(
        'Melde eine Lernenden-Sitzung an, um diese Ansicht zu nutzen.',
      );
    });
  });
});

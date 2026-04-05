/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts/kangur-ai-tutor-mood';
import type {
  KangurAuthSession,
  KangurUser,
} from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  listDuelLobbyChatMock,
  sendDuelLobbyChatMessageMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  listDuelLobbyChatMock: vi.fn(),
  sendDuelLobbyChatMessageMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileDuelLobbyChat } from './useKangurMobileDuelLobbyChat';

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

describe('useKangurMobileDuelLobbyChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listDuelLobbyChatMock.mockResolvedValue({
      messages: [
        {
          createdAt: '2026-03-21T08:12:00.000Z',
          id: 'chat-1',
          lobbyId: 'duels_lobby',
          message: 'Szukam meczu z mnozeniem.',
          senderAvatarId: null,
          senderId: 'learner-2',
          senderName: 'Maja Sprint',
        },
      ],
      nextCursor: null,
      serverTime: '2026-03-21T08:12:00.000Z',
    });
    sendDuelLobbyChatMessageMock.mockResolvedValue({
      message: {
        createdAt: '2026-03-21T08:13:00.000Z',
        id: 'chat-2',
        lobbyId: 'duels_lobby',
        message: 'Jestem gotowa.',
        senderAvatarId: null,
        senderId: 'learner-1',
        senderName: 'Ada Learner',
      },
      serverTime: '2026-03-21T08:13:00.000Z',
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        listDuelLobbyChat: listDuelLobbyChatMock,
        sendDuelLobbyChatMessage: sendDuelLobbyChatMessageMock,
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

  it('loads recent lobby chat messages for the signed-in learner', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelLobbyChat(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]?.senderName).toBe('Maja Sprint');
    expect(result.current.error).toBeNull();
  });

  it('localizes German network errors when the chat fetch fails', async () => {
    listDuelLobbyChatMock.mockRejectedValueOnce(new Error('Failed to fetch'));

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileDuelLobbyChat(), {
      wrapper: createWrapper(queryClient, 'de'),
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Der Lobby-Chat konnte nicht geladen werden.',
      );
    });
  });
});

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
  type KangurDuelLobbyChatListResponse,
  type KangurDuelLobbyChatMessage,
} from '@kangur/contracts/kangur-duels-chat';
import { type KangurAuthSession } from '@kangur/platform';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveMobileDuelErrorMessage } from './mobileDuelErrorMessages';
import { type DuelApiClient } from './useKangurMobileDuelsLobbyQueries';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

export interface UseKangurMobileDuelLobbyChatResult {
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  isSending: boolean;
  maxMessageLength: number;
  messages: KangurDuelLobbyChatMessage[];
  refresh: () => Promise<void>;
  sendMessage: (message: string) => Promise<boolean>;
}

function appendMessage(
  current: KangurDuelLobbyChatListResponse,
  incoming: KangurDuelLobbyChatMessage,
): KangurDuelLobbyChatListResponse {
  const existingMessages = current.messages;
  const deduped = existingMessages.filter((msg) => msg.id !== incoming.id);
  return {
    messages: [...deduped, incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    nextCursor: current.nextCursor,
    serverTime: current.serverTime,
  };
}

function getLearnerIdentity(user: KangurAuthSession['user']): string {
  return user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest';
}

function useDuelLobbyChatSender({
  refetchChat,
  queryClient,
  queryKey,
  typedApiClient,
}: {
  refetchChat: () => Promise<unknown>;
  queryClient: ReturnType<typeof useQueryClient>;
  queryKey: readonly unknown[];
  typedApiClient: DuelApiClient;
}): {
  isSending: boolean;
  sendMessage: (message: string) => Promise<boolean>;
} {
  const [isSending, setIsSending] = useState(false);
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      const trimmed = message.trim();
      if (trimmed === '') return false;
      setIsSending(true);
      try {
        const response = await typedApiClient.sendDuelLobbyChatMessage(
          { message: trimmed },
          { cache: 'no-store' }
        );
        queryClient.setQueryData<KangurDuelLobbyChatListResponse>(queryKey, (cur) => {
          const fallback = { messages: [], nextCursor: null, serverTime: new Date().toISOString() };
          return appendMessage(cur ?? fallback, response.message);
        });
        return true;
      } catch {
        await refetchChat();
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [queryClient, queryKey, refetchChat, typedApiClient]
  );

  return { isSending, sendMessage };
}

export const useKangurMobileDuelLobbyChat = (): UseKangurMobileDuelLobbyChatResult => {
  const { copy } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const typedApiClient = apiClient as unknown as DuelApiClient;
  const { isLoadingAuth, session } = useKangurMobileAuth();

  const { status, user } = session;
  const isAuthenticated = status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;

  const queryKey = useMemo(
    () => ['kangur-mobile', 'duels', 'lobby-chat', apiBaseUrl, getLearnerIdentity(user)] as const,
    [apiBaseUrl, user]
  );

  const chatQuery = useKangurMobileQueryV2<KangurDuelLobbyChatListResponse>({
    enabled: isAuthenticated,
    queryKey,
    queryFn: async (): Promise<KangurDuelLobbyChatListResponse> =>
      await typedApiClient.listDuelLobbyChat(
        { limit: KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT },
        { cache: 'no-store' }
      ),
    refetchInterval: 4_000,
    staleTime: 8_000,
    meta: {
      source: 'kangur.mobile.duels.lobby-chat',
      operation: 'list',
      resource: 'kangur.mobile.duels.lobby-chat',
      queryKey,
      description: 'Loads Kangur mobile duel lobby chat messages.',
      tags: ['kangur-mobile', 'duels', 'chat'],
    },
  });

  const { isSending, sendMessage } = useDuelLobbyChatSender({
    refetchChat: chatQuery.refetch,
    queryClient,
    queryKey,
    typedApiClient,
  });

  return {
    error: resolveMobileDuelErrorMessage({
      error: chatQuery.error,
      copy,
      fallback: { de: 'Fehler', en: 'Error', pl: 'Błąd' },
      unauthorized: { de: 'Nicht angemeldet', en: 'Not signed in', pl: 'Niezalogowany' },
      unauthorizedStatuses: [401, 403],
    }),
    isAuthenticated,
    isLoading: isRestoringAuth || chatQuery.isLoading,
    isRestoringAuth,
    isSending,
    maxMessageLength: KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
    messages: chatQuery.data?.messages ?? [],
    refresh: async (): Promise<void> => { await chatQuery.refetch(); },
    sendMessage,
  };
};

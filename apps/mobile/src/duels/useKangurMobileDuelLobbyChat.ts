import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
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

function getChatQueryConfig(
  isAuthenticated: boolean,
  queryKey: readonly unknown[],
  apiClient: DuelApiClient
): UseQueryOptions<KangurDuelLobbyChatListResponse, Error> {
  return {
    enabled: isAuthenticated,
    queryKey,
    queryFn: async (): Promise<KangurDuelLobbyChatListResponse> =>
      await apiClient.listDuelLobbyChat({ limit: KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT }, { cache: 'no-store' }),
    refetchInterval: 4_000,
    staleTime: 8_000,
  };
}

function getLearnerIdentity(user: KangurAuthSession['user']): string {
  return user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest';
}

export const useKangurMobileDuelLobbyChat = (): UseKangurMobileDuelLobbyChatResult => {
  const { copy } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const typedApiClient = apiClient as DuelApiClient;
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [isSending, setIsSending] = useState(false);

  const { status, user } = session;
  const isAuthenticated = status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;

  const queryKey = useMemo(
    () => ['kangur-mobile', 'duels', 'lobby-chat', apiBaseUrl, getLearnerIdentity(user)] as const,
    [apiBaseUrl, user]
  );

  const chatQuery = useQuery<KangurDuelLobbyChatListResponse, Error>(
    getChatQueryConfig(isAuthenticated, queryKey, typedApiClient)
  );

  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    const trimmed = message.trim();
    if (trimmed === '') return false;
    setIsSending(true);
    try {
      const response = await typedApiClient.sendDuelLobbyChatMessage({ message: trimmed }, { cache: 'no-store' });
      queryClient.setQueryData<KangurDuelLobbyChatListResponse>(queryKey, (cur) => {
        const fallback = { messages: [], nextCursor: null, serverTime: new Date().toISOString() };
        return appendMessage(cur ?? fallback, response.message);
      });
      return true;
    } catch {
      await chatQuery.refetch();
      return false;
    } finally {
      setIsSending(false);
    }
  }, [typedApiClient, queryClient, queryKey, chatQuery]);

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

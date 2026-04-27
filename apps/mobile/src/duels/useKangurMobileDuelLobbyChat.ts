import type { KangurDuelLobbyChatListResponse, KangurDuelLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import { KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT, KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH } from '@kangur/contracts/kangur-duels-chat';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveMobileDuelErrorMessage } from './mobileDuelErrorMessages';

const MOBILE_DUEL_CHAT_POLL_MS = 12_000;

export type UseKangurMobileDuelLobbyChatResult = {
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  isSending: boolean;
  maxMessageLength: number;
  messages: KangurDuelLobbyChatMessage[];
  refresh: () => Promise<void>;
  sendMessage: (message: string) => Promise<boolean>;
};

function appendMessage(
  current: KangurDuelLobbyChatListResponse | undefined,
  incoming: KangurDuelLobbyChatMessage,
): KangurDuelLobbyChatListResponse {
  const existingMessages = current?.messages ?? [];
  const deduped = existingMessages.filter((message) => message.id !== incoming.id);

  return {
    messages: [...deduped, incoming].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    ),
    nextCursor: current?.nextCursor ?? null,
    serverTime: current?.serverTime ?? incoming.createdAt,
  };
}

import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

function resolveChatError(error: unknown, copy: DuelCopy): string | null {
  return resolveMobileDuelErrorMessage({
    error, copy,
    fallback: { de: 'Der Lobby-Chat konnte nicht geladen werden.', en: 'Could not load the lobby chat.', pl: 'Nie udało się pobrać czatu lobby.' },
    unauthorized: { de: 'Melde dich an, um den Lobby-Chat zu nutzen.', en: 'Sign in to use the lobby chat.', pl: 'Zaloguj się, aby korzystać z czatu lobby.' },
    unauthorizedStatuses: [401, 403],
  });
}

import type { 
} from '@kangur/contracts/kangur-duels-chat';

function getLobbyChatList(apiClient: DuelApiClient, limit: number): Promise<KangurDuelLobbyChatListResponse> {
  return apiClient.listDuelLobbyChat({ limit }, { cache: 'no-store' });
}

import type { UseQueryOptions } from '@tanstack/react-query';

function getChatQueryConfig(
  isAuthenticated: boolean, 
  queryKey: readonly unknown[], 
  apiClient: DuelApiClient
): UseQueryOptions<KangurDuelLobbyChatListResponse, Error> {
  return {
    enabled: isAuthenticated,
    queryKey,
    queryFn: async (): Promise<KangurDuelLobbyChatListResponse> => 
      await getLobbyChatList(apiClient, KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT),
    refetchInterval: MOBILE_DUEL_CHAT_POLL_MS,
    staleTime: 8_000,
  };
}

import { 
} from '@kangur/contracts/kangur-duels-chat';
import type { DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

function getLobbyChatQueryKey(apiBaseUrl: string, learnerIdentity: string): readonly [string, string, string, string, string] {
  return ['kangur-mobile', 'duels', 'lobby-chat', apiBaseUrl, learnerIdentity] as const;
}

function appendMessage(
  current: KangurDuelLobbyChatListResponse | undefined,
  incoming: KangurDuelLobbyChatMessage,
): KangurDuelLobbyChatListResponse {
  const existingMessages = current?.messages ?? [];
  const deduped = existingMessages.filter((message) => message.id !== incoming.id);

  return {
    messages: [...deduped, incoming].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    ),
    nextCursor: current?.nextCursor ?? null,
    serverTime: current?.serverTime ?? incoming.createdAt,
  };
}

export const useKangurMobileDuelLobbyChat = (): UseKangurMobileDuelLobbyChatResult => {
    const { copy } = useKangurMobileI18n();
    const queryClient = useQueryClient();
    const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
    const apiClient = rawApiClient as unknown as DuelApiClient;
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const [isSending, setIsSending] = useState(false);
    const learnerIdentity = session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';
    const isAuthenticated = session.status === 'authenticated';
    const queryKey = getLobbyChatQueryKey(apiBaseUrl, learnerIdentity);

    const chatQuery = useQuery(getChatQueryConfig(isAuthenticated, queryKey, apiClient));

    const sendMessage = async (message: string): Promise<boolean> => {
      const trimmed = message.trim();
      if (trimmed === '') return false;
      setIsSending(true);
      try {
        const response = await apiClient.sendDuelLobbyChatMessage({ message: trimmed }, { cache: 'no-store' });
        queryClient.setQueryData<KangurDuelLobbyChatListResponse>(queryKey, (cur) => {
          const currentData = cur ?? { messages: [], nextCursor: null, serverTime: new Date().toISOString() };
          return appendMessage(currentData, response.message);
        });
        return true;
      } catch { 
        await chatQuery.refetch(); 
        return false; 
      } finally { 
        setIsSending(false); 
      }
    };

    return {
      error: resolveChatError(chatQuery.error, copy),
      isAuthenticated,
      isLoading: (isLoadingAuth && !isAuthenticated) || chatQuery.isLoading,
      isRestoringAuth: isLoadingAuth && !isAuthenticated,
      isSending,
      maxMessageLength: KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
      messages: chatQuery.data?.messages ?? [],
      refresh: async (): Promise<void> => { await chatQuery.refetch(); },
      sendMessage,
    };
  };

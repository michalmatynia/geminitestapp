import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
  type KangurDuelLobbyChatListResponse,
  type KangurDuelLobbyChatMessage,
} from '@kangur/contracts/kangur-duels-chat';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveMobileDuelErrorMessage } from './utils/duels-ui';
import { type DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

export interface UseKangurMobileDuelsLobbyChatResult {
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

export const useKangurMobileDuelLobbyChat = (): UseKangurMobileDuelsLobbyChatResult => {
  const { copy } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const typedApiClient = apiClient as DuelApiClient;
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [isSending, setIsSending] = useState(false);
  const learnerIdentity = session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';
  const isAuthenticated = session.status === 'authenticated';
  const queryKey = useMemo(() => ['kangur-mobile', 'duels', 'lobby-chat', apiBaseUrl, learnerIdentity] as const, [apiBaseUrl, learnerIdentity]);

  const chatQuery = useQuery<KangurDuelLobbyChatListResponse, Error>(getChatQueryConfig(isAuthenticated, queryKey, typedApiClient));

interface SendMessageResponse {
  message: KangurDuelLobbyChatMessage;
}

// ... inside useKangurMobileDuelLobbyChat
  interface ChatSenderResult {
    sendMessage: (message: string) => Promise<boolean>;
  }

  function useChatSender(
    apiClient: DuelApiClient,
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    chatQuery: UseQueryResult<KangurDuelLobbyChatListResponse, Error>,
    setIsSending: (sending: boolean) => void
  ): ChatSenderResult {
    const sendMessage = async (message: string): Promise<boolean> => {
      const trimmed = message.trim();
      if (trimmed === '') return false;
      setIsSending(true);
      try {
        const response: SendChatResponse = await apiClient.sendDuelLobbyChatMessage(
          { message: trimmed },
          { cache: 'no-store' }
        );
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
    return { sendMessage };
  }

  export const useKangurMobileDuelLobbyChat = (): UseKangurMobileDuelsLobbyChatResult => {
    const { copy } = useKangurMobileI18n();
    const queryClient = useQueryClient();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const typedApiClient = apiClient as DuelApiClient;
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const [isSending, setIsSending] = useState(false);
    const learnerIdentity = session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';
    const isAuthenticated = session.status === 'authenticated';
    const queryKey = useMemo(() => ['kangur-mobile', 'duels', 'lobby-chat', apiBaseUrl, learnerIdentity] as const, [apiBaseUrl, learnerIdentity]);
    const chatQuery = useQuery<KangurDuelLobbyChatListResponse, Error>(getChatQueryConfig(isAuthenticated, queryKey, typedApiClient));
    const { sendMessage } = useChatSender(typedApiClient, queryClient, queryKey, chatQuery, setIsSending);

  return {
    error: resolveMobileDuelErrorMessage({
      error: chatQuery.error,
      copy,
      fallback: { de: 'Fehler', en: 'Error', pl: 'Błąd' },
      unauthorized: { de: 'Nicht angemeldet', en: 'Not signed in', pl: 'Niezalogowany' },
      unauthorizedStatuses: [401, 403],
    }),
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
export {};

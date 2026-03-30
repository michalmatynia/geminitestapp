import type {
  KangurDuelLobbyChatListResponse,
  KangurDuelLobbyChatMessage,
} from '@kangur/contracts';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
} from '@kangur/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveMobileDuelErrorMessage } from './mobileDuelErrorMessages';

const MOBILE_DUEL_CHAT_POLL_MS = 12_000;

type UseKangurMobileDuelLobbyChatResult = {
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

const appendMessage = (
  current: KangurDuelLobbyChatListResponse | undefined,
  incoming: KangurDuelLobbyChatMessage,
): KangurDuelLobbyChatListResponse => {
  const existingMessages = current?.messages ?? [];
  const deduped = existingMessages.filter((message) => message.id !== incoming.id);

  return {
    messages: [...deduped, incoming].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    ),
    nextCursor: current?.nextCursor ?? null,
    serverTime: current?.serverTime ?? incoming.createdAt,
  };
};

export const useKangurMobileDuelLobbyChat =
  (): UseKangurMobileDuelLobbyChatResult => {
    const { copy } = useKangurMobileI18n();
    const queryClient = useQueryClient();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const [isSending, setIsSending] = useState(false);
    const learnerIdentity =
      session.user?.activeLearner?.id ??
      session.user?.email ??
      session.user?.id ??
      'guest';
    const isAuthenticated = session.status === 'authenticated';
    const isRestoringAuth = isLoadingAuth && !isAuthenticated;
    const queryKey = [
      'kangur-mobile',
      'duels',
      'lobby-chat',
      apiBaseUrl,
      learnerIdentity,
    ] as const;

    const chatQuery = useQuery({
      enabled: isAuthenticated,
      queryKey,
      queryFn: async () =>
        apiClient.listDuelLobbyChat(
          { limit: KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT },
          { cache: 'no-store' },
        ),
      refetchInterval: MOBILE_DUEL_CHAT_POLL_MS,
      staleTime: 8_000,
    });

    return {
      error: resolveMobileDuelErrorMessage({
        error: chatQuery.error,
        copy,
        fallback: {
          de: 'Der Lobby-Chat konnte nicht geladen werden.',
          en: 'Could not load the lobby chat.',
          pl: 'Nie udało się pobrać czatu lobby.',
        },
        unauthorized: {
          de: 'Melde dich an, um den Lobby-Chat zu nutzen.',
          en: 'Sign in to use the lobby chat.',
          pl: 'Zaloguj się, aby korzystać z czatu lobby.',
        },
        unauthorizedStatuses: [401, 403],
      }),
      isAuthenticated,
      isLoading: isRestoringAuth || chatQuery.isLoading,
      isRestoringAuth,
      isSending,
      maxMessageLength: KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
      messages: chatQuery.data?.messages ?? [],
      refresh: async () => {
        await chatQuery.refetch();
      },
      sendMessage: async (message) => {
        const trimmed = message.trim();
        if (!trimmed) {
          return false;
        }

        setIsSending(true);

        try {
          const response = await apiClient.sendDuelLobbyChatMessage(
            {
              message: trimmed,
            },
            { cache: 'no-store' },
          );

          queryClient.setQueryData<KangurDuelLobbyChatListResponse>(queryKey, (current) =>
            appendMessage(current, response.message),
          );

          return true;
        } catch {
          await chatQuery.refetch();
          return false;
        } finally {
          setIsSending(false);
        }
      },
    };
  };

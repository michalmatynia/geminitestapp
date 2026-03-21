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
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

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

const toChatErrorMessage = (
  error: unknown,
  fallback: string,
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401 || status === 403) {
      return copy({
        de: 'Melde eine Lernenden-Sitzung an, um den Lobby-Chat zu nutzen.',
        en: 'Sign in the learner session to use the lobby chat.',
        pl: 'Zaloguj sesję ucznia, aby korzystać z czatu lobby.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Verbindung zur Kangur-API konnte nicht hergestellt werden.',
      en: 'Could not connect to the Kangur API.',
      pl: 'Nie udało się połączyć z API Kangura.',
    });
  }

  return message;
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
      error: toChatErrorMessage(
        chatQuery.error,
        copy({
          de: 'Der Lobby-Chat konnte nicht geladen werden.',
          en: 'Could not load the lobby chat.',
          pl: 'Nie udało się pobrać czatu lobby.',
        }),
        copy,
      ),
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

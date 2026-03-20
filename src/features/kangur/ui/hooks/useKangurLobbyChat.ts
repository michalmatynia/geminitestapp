'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  trackKangurClientEvent,
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { KANGUR_DUELS_LOBBY_CHAT_STREAM_ENDPOINT } from '@/features/kangur/services/local-kangur-platform-endpoints';
import type {
  KangurDuelLobbyChatCreateInput,
  KangurDuelLobbyChatMessage,
  KangurDuelLobbyChatSendResponse,
} from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  kangurDuelLobbyChatListResponseSchema,
  kangurDuelLobbyChatMessageSchema,
  KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
} from '@/shared/contracts/kangur-duels-chat';

const kangurPlatform = getKangurPlatform();
const DEFAULT_REFRESH_INTERVAL_MS = 20_000;
const ENABLE_LOBBY_CHAT_SSE =
  process.env['NEXT_PUBLIC_KANGUR_DUELS_LOBBY_CHAT_SSE'] !== 'false';

const mergeMessages = (
  current: KangurDuelLobbyChatMessage[],
  incoming: KangurDuelLobbyChatMessage[]
): KangurDuelLobbyChatMessage[] => {
  const map = new Map<string, KangurDuelLobbyChatMessage>();
  for (const message of current) {
    map.set(message.id, message);
  }
  for (const message of incoming) {
    map.set(message.id, message);
  }
  return Array.from(map.values()).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
};

type UseKangurLobbyChatOptions = {
  enabled?: boolean;
  isOnline?: boolean;
  limit?: number;
  refreshIntervalMs?: number;
  streamEnabled?: boolean;
};

type UseKangurLobbyChatResult = {
  messages: KangurDuelLobbyChatMessage[];
  isLoading: boolean;
  isLoadingOlder: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  nextCursor: string | null;
  refresh: () => Promise<void>;
  loadOlder: () => Promise<void>;
  sendMessage: (input: KangurDuelLobbyChatCreateInput) => Promise<KangurDuelLobbyChatSendResponse>;
  maxMessageLength: number;
};

export const useKangurLobbyChat = (
  options: UseKangurLobbyChatOptions = {}
): UseKangurLobbyChatResult => {
  const enabled = options.enabled ?? true;
  const isOnline = options.isOnline ?? true;
  const limit = options.limit ?? KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT;
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const streamEnabled = options.streamEnabled ?? true;

  const [messages, setMessages] = useState<KangurDuelLobbyChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const refreshAbortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const hasLoadedOlderRef = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled || !isOnline) {
      setIsLoading(false);
      return;
    }

    if (!kangurPlatform.lobbyChat) {
      setIsLoading(false);
      return;
    }

    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await withKangurClientError(
        () => ({
          source: 'kangur.hooks.useKangurLobbyChat',
          action: 'refresh',
          description: 'Loads lobby chat messages from the Kangur API.',
          context: { limit },
        }),
        async () =>
          await kangurPlatform.lobbyChat.list({
            limit,
            signal: controller.signal,
          }),
        {
          fallback: null,
          onError: (error) => {
            if (isKangurAuthStatusError(error)) {
              setError(null);
            } else {
              setError('Nie udało się pobrać wiadomości czatu.');
            }
          },
        }
      );
      if (response) {
        setMessages((current) =>
          hasLoadedOlderRef.current ? mergeMessages(current, response.messages) : response.messages
        );
        setLastUpdatedAt(response.serverTime ?? null);
        if (!hasLoadedOlderRef.current) {
          setNextCursor(response.nextCursor ?? null);
        }
      }
    } finally {
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }
      setIsLoading(false);
    }
  }, [enabled, isOnline, limit]);

  const loadOlder = useCallback(async (): Promise<void> => {
    if (!enabled || !isOnline) {
      return;
    }
    if (!kangurPlatform.lobbyChat) {
      return;
    }
    if (!nextCursor || isLoadingOlder) {
      return;
    }

    setIsLoadingOlder(true);
    setError(null);

    try {
      const response = await withKangurClientError(
        () => ({
          source: 'kangur.hooks.useKangurLobbyChat',
          action: 'load-older',
          description: 'Loads older lobby chat messages from the Kangur API.',
          context: { limit, nextCursor },
        }),
        async () =>
          await kangurPlatform.lobbyChat.list({
            limit,
            before: nextCursor,
          }),
        {
          fallback: null,
          onError: (error) => {
            if (!isKangurAuthStatusError(error)) {
              setError('Nie udało się pobrać starszych wiadomości.');
            }
          },
        }
      );
      if (response) {
        setMessages((current) => mergeMessages(response.messages, current));
        setLastUpdatedAt(response.serverTime ?? null);
        setNextCursor(response.nextCursor ?? null);
        hasLoadedOlderRef.current = true;
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [enabled, isOnline, isLoadingOlder, limit, nextCursor]);

  const sendMessage = useCallback(
    async (input: KangurDuelLobbyChatCreateInput): Promise<KangurDuelLobbyChatSendResponse> => {
      if (!kangurPlatform.lobbyChat) {
        throw new Error('Lobby chat is unavailable.');
      }
      setIsSending(true);
      setError(null);

      try {
        const response = await withKangurClientError(
          () => ({
            source: 'kangur.hooks.useKangurLobbyChat',
            action: 'send-message',
            description: 'Sends a lobby chat message to the Kangur API.',
            context: {
              messageLength: input.message?.length ?? 0,
            },
          }),
          async () => await kangurPlatform.lobbyChat.send(input),
          {
            fallback: null,
            onError: (error) => {
              trackKangurClientEvent('kangur_duels_lobby_chat_send_failed', {
                errorMessage: error instanceof Error ? error.message : String(error),
              });
              if (!isKangurAuthStatusError(error)) {
                setError(error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości.');
              }
            },
            shouldRethrow: () => true,
          }
        );
        if (!response) {
          throw new Error('Lobby chat send response missing.');
        }
        setMessages((current) => mergeMessages(current, [response.message]));
        setLastUpdatedAt(response.serverTime ?? null);
        trackKangurClientEvent('kangur_duels_lobby_chat_sent', {
          length: response.message.message.length,
        });
        return response;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  useEffect(() => {
    void refresh();
    return () => {
      refreshAbortRef.current?.abort();
      refreshAbortRef.current = null;
    };
  }, [refresh]);

  useInterval(
    () => {
      if (!isStreaming) {
        void refresh();
      }
    },
    enabled && isOnline && refreshIntervalMs > 0 ? refreshIntervalMs : null
  );

  useEffect(() => {
    if (
      !enabled ||
      !isOnline ||
      !streamEnabled ||
      !ENABLE_LOBBY_CHAT_SSE ||
      typeof window === 'undefined' ||
      typeof EventSource === 'undefined'
    ) {
      setIsStreaming(false);
      return;
    }

    const streamUrl = `${KANGUR_DUELS_LOBBY_CHAT_STREAM_ENDPOINT}?limit=${encodeURIComponent(
      limit
    )}`;
    const source = withKangurClientErrorSync(
      {
        source: 'kangur.hooks.useKangurLobbyChat',
        action: 'open-stream',
        description: 'Opens the lobby chat SSE stream.',
        context: { streamUrl },
      },
      () => new EventSource(streamUrl),
      { fallback: null }
    );
    if (!source) {
      return;
    }

    streamRef.current = source;
    setIsStreaming(true);

    const closeStream = (): void => {
      source.close();
      if (streamRef.current === source) {
        streamRef.current = null;
      }
      setIsStreaming(false);
    };

    source.onmessage = (event: MessageEvent<string>): void => {
      const payload = withKangurClientErrorSync(
        {
          source: 'kangur.hooks.useKangurLobbyChat',
          action: 'parse-stream',
          description: 'Parses lobby chat SSE payloads.',
        },
        () => JSON.parse(event.data) as { type?: string; data?: unknown },
        { fallback: null }
      );
      if (!payload) {
        return;
      }
      if (payload.type === 'heartbeat' || payload.type === 'ready') {
        return;
      }
      if (payload.type === 'fallback') {
        closeStream();
        return;
      }
      if (payload.type === 'snapshot') {
        const parsed = kangurDuelLobbyChatListResponseSchema.safeParse(payload.data);
        if (parsed.success) {
          setMessages((current) =>
            hasLoadedOlderRef.current
              ? mergeMessages(current, parsed.data.messages)
              : parsed.data.messages
          );
          setLastUpdatedAt(parsed.data.serverTime ?? null);
          if (!hasLoadedOlderRef.current) {
            setNextCursor(parsed.data.nextCursor ?? null);
          }
          setError(null);
          setIsLoading(false);
        }
        return;
      }
      if (payload.type === 'message') {
        const parsedMessage = kangurDuelLobbyChatMessageSchema.safeParse(payload.data);
        if (parsedMessage.success) {
          setMessages((current) => mergeMessages(current, [parsedMessage.data]));
        }
      }
    };

    source.onerror = () => {
      closeStream();
    };

    return () => {
      closeStream();
    };
  }, [enabled, isOnline, limit, streamEnabled]);

  const resolvedMessages = useMemo(() => messages, [messages]);

  return {
    messages: resolvedMessages,
    isLoading: enabled ? isLoading : false,
    isLoadingOlder,
    isSending,
    isStreaming,
    error,
    lastUpdatedAt,
    nextCursor,
    refresh,
    loadOlder,
    sendMessage,
    maxMessageLength: KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
  };
};

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import {
  trackKangurClientEvent,
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { KANGUR_DUELS_LOBBY_CHAT_STREAM_ENDPOINT } from '@/features/kangur/services/local-kangur-platform-endpoints';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import type {
  KangurDuelLobbyChatCreateInput,
  KangurDuelLobbyChatMessage,
  KangurDuelLobbyChatSendResponse,
} from '@kangur/platform';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH,
  kangurDuelLobbyChatListResponseSchema,
  kangurDuelLobbyChatMessageSchema,
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

type KangurLobbyChatStateControllers = {
  setError: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOlder: Dispatch<SetStateAction<boolean>>;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setLastUpdatedAt: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<KangurDuelLobbyChatMessage[]>>;
  setNextCursor: Dispatch<SetStateAction<string | null>>;
};

type KangurLobbyChatRuntimeRefs = {
  hasLoadedOlderRef: MutableRefObject<boolean>;
  refreshAbortRef: MutableRefObject<AbortController | null>;
  streamRef: MutableRefObject<EventSource | null>;
};

type KangurLobbyChatStreamPayload = {
  type?: string;
  data?: unknown;
};

const resolveKangurLobbyChatEnabled = (options: UseKangurLobbyChatOptions): boolean =>
  options.enabled ?? true;

const resolveKangurLobbyChatOnline = (options: UseKangurLobbyChatOptions): boolean =>
  options.isOnline ?? true;

const resolveKangurLobbyChatLimit = (options: UseKangurLobbyChatOptions): number =>
  options.limit ?? KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT;

const resolveKangurLobbyChatRefreshIntervalMs = (
  options: UseKangurLobbyChatOptions
): number => options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;

const resolveKangurLobbyChatStreamEnabled = (
  options: UseKangurLobbyChatOptions
): boolean => options.streamEnabled ?? true;

const canRefreshKangurLobbyChat = ({
  enabled,
  isOnline,
}: {
  enabled: boolean;
  isOnline: boolean;
}): boolean => enabled && isOnline && Boolean(kangurPlatform.lobbyChat);

const canLoadOlderKangurLobbyChat = ({
  enabled,
  isLoadingOlder,
  isOnline,
  nextCursor,
}: {
  enabled: boolean;
  isLoadingOlder: boolean;
  isOnline: boolean;
  nextCursor: string | null;
}): boolean =>
  canRefreshKangurLobbyChat({ enabled, isOnline }) && Boolean(nextCursor) && !isLoadingOlder;

const canUseKangurLobbyChatStream = ({
  enabled,
  isOnline,
  streamEnabled,
}: {
  enabled: boolean;
  isOnline: boolean;
  streamEnabled: boolean;
}): boolean =>
  enabled &&
  isOnline &&
  streamEnabled &&
  ENABLE_LOBBY_CHAT_SSE &&
  typeof window !== 'undefined' &&
  typeof EventSource !== 'undefined';

const resolveKangurLobbyChatPollInterval = ({
  enabled,
  isOnline,
  isStreaming,
  refreshIntervalMs,
}: {
  enabled: boolean;
  isOnline: boolean;
  isStreaming: boolean;
  refreshIntervalMs: number;
}): number | null =>
  enabled && isOnline && refreshIntervalMs > 0 && !isStreaming ? refreshIntervalMs : null;

const clearKangurLobbyChatLoading = (
  setIsLoading: Dispatch<SetStateAction<boolean>>
): void => {
  setIsLoading(false);
};

const applyKangurLobbyChatListResponse = ({
  hasLoadedOlderRef,
  response,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
}: Pick<
  KangurLobbyChatStateControllers,
  'setLastUpdatedAt' | 'setMessages' | 'setNextCursor'
> & {
  hasLoadedOlderRef: MutableRefObject<boolean>;
  response: {
    messages: KangurDuelLobbyChatMessage[];
    nextCursor?: string | null;
    serverTime?: string | null;
  };
}): void => {
  setMessages((current) =>
    hasLoadedOlderRef.current ? mergeMessages(current, response.messages) : response.messages
  );
  setLastUpdatedAt(response.serverTime ?? null);
  if (!hasLoadedOlderRef.current) {
    setNextCursor(response.nextCursor ?? null);
  }
};

const applyKangurLobbyChatOlderResponse = ({
  hasLoadedOlderRef,
  response,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
}: Pick<
  KangurLobbyChatStateControllers,
  'setLastUpdatedAt' | 'setMessages' | 'setNextCursor'
> & {
  hasLoadedOlderRef: MutableRefObject<boolean>;
  response: {
    messages: KangurDuelLobbyChatMessage[];
    nextCursor?: string | null;
    serverTime?: string | null;
  };
}): void => {
  setMessages((current) => mergeMessages(response.messages, current));
  setLastUpdatedAt(response.serverTime ?? null);
  setNextCursor(response.nextCursor ?? null);
  hasLoadedOlderRef.current = true;
};

const openKangurLobbyChatStream = (limit: number): EventSource | null => {
  const streamUrl = `${KANGUR_DUELS_LOBBY_CHAT_STREAM_ENDPOINT}?limit=${encodeURIComponent(limit)}`;
  return withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLobbyChat',
      action: 'open-stream',
      description: 'Opens the lobby chat SSE stream.',
      context: { streamUrl },
    },
    () => new EventSource(streamUrl),
    { fallback: null }
  );
};

const parseKangurLobbyChatStreamPayload = (
  event: MessageEvent<string>
): KangurLobbyChatStreamPayload | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLobbyChat',
      action: 'parse-stream',
      description: 'Parses lobby chat SSE payloads.',
    },
    () => JSON.parse(event.data) as KangurLobbyChatStreamPayload,
    { fallback: null }
  );

const closeKangurLobbyChatStream = ({
  setIsStreaming,
  source,
  streamRef,
}: Pick<KangurLobbyChatStateControllers, 'setIsStreaming'> & {
  source: EventSource;
  streamRef: MutableRefObject<EventSource | null>;
}): void => {
  source.close();
  if (streamRef.current === source) {
    streamRef.current = null;
  }
  setIsStreaming(false);
};

const applyKangurLobbyChatSnapshotPayload = ({
  hasLoadedOlderRef,
  payloadData,
  setError,
  setIsLoading,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
}: Pick<
  KangurLobbyChatStateControllers,
  'setError' | 'setIsLoading' | 'setLastUpdatedAt' | 'setMessages' | 'setNextCursor'
> & {
  hasLoadedOlderRef: MutableRefObject<boolean>;
  payloadData: unknown;
}): void => {
  const parsed = kangurDuelLobbyChatListResponseSchema.safeParse(payloadData);
  if (!parsed.success) {
    return;
  }
  applyKangurLobbyChatListResponse({
    hasLoadedOlderRef,
    response: parsed.data,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
  });
  setError(null);
  setIsLoading(false);
};

const applyKangurLobbyChatMessagePayload = ({
  payloadData,
  setMessages,
}: Pick<KangurLobbyChatStateControllers, 'setMessages'> & {
  payloadData: unknown;
}): void => {
  const parsedMessage = kangurDuelLobbyChatMessageSchema.safeParse(payloadData);
  if (!parsedMessage.success) {
    return;
  }
  setMessages((current) => mergeMessages(current, [parsedMessage.data]));
};

const useKangurLobbyChatRefresh = ({
  enabled,
  hasLoadedOlderRef,
  isOnline,
  limit,
  refreshAbortRef,
  setError,
  setIsLoading,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
}: Pick<
  KangurLobbyChatStateControllers,
  'setError' | 'setIsLoading' | 'setLastUpdatedAt' | 'setMessages' | 'setNextCursor'
> &
  Pick<KangurLobbyChatRuntimeRefs, 'hasLoadedOlderRef' | 'refreshAbortRef'> & {
    enabled: boolean;
    isOnline: boolean;
    limit: number;
  }): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    if (!canRefreshKangurLobbyChat({ enabled, isOnline })) {
      clearKangurLobbyChatLoading(setIsLoading);
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
            setError(
              isKangurAuthStatusError(error)
                ? null
                : 'Nie udało się pobrać wiadomości czatu.'
            );
          },
        }
      );
      if (!response) {
        return;
      }
      applyKangurLobbyChatListResponse({
        hasLoadedOlderRef,
        response,
        setLastUpdatedAt,
        setMessages,
        setNextCursor,
      });
    } finally {
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }
      setIsLoading(false);
    }
  }, [
    enabled,
    hasLoadedOlderRef,
    isOnline,
    limit,
    refreshAbortRef,
    setError,
    setIsLoading,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
  ]);

const useKangurLobbyChatLoadOlder = ({
  enabled,
  hasLoadedOlderRef,
  isLoadingOlder,
  isOnline,
  limit,
  nextCursor,
  setError,
  setIsLoadingOlder,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
}: Pick<
  KangurLobbyChatStateControllers,
  'setError' | 'setIsLoadingOlder' | 'setLastUpdatedAt' | 'setMessages' | 'setNextCursor'
> &
  Pick<KangurLobbyChatRuntimeRefs, 'hasLoadedOlderRef'> & {
    enabled: boolean;
    isLoadingOlder: boolean;
    isOnline: boolean;
    limit: number;
    nextCursor: string | null;
  }): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    if (
      !canLoadOlderKangurLobbyChat({
        enabled,
        isLoadingOlder,
        isOnline,
        nextCursor,
      })
    ) {
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
            before: nextCursor,
            limit,
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
      if (!response) {
        return;
      }
      applyKangurLobbyChatOlderResponse({
        hasLoadedOlderRef,
        response,
        setLastUpdatedAt,
        setMessages,
        setNextCursor,
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }, [
    enabled,
    hasLoadedOlderRef,
    isLoadingOlder,
    isOnline,
    limit,
    nextCursor,
    setError,
    setIsLoadingOlder,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
  ]);

const useKangurLobbyChatSendMessage = ({
  setError,
  setIsSending,
  setLastUpdatedAt,
  setMessages,
}: Pick<
  KangurLobbyChatStateControllers,
  'setError' | 'setIsSending' | 'setLastUpdatedAt' | 'setMessages'
>): ((
  input: KangurDuelLobbyChatCreateInput
) => Promise<KangurDuelLobbyChatSendResponse>) =>
  useCallback(
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
                setError(
                  error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości.'
                );
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
    [setError, setIsSending, setLastUpdatedAt, setMessages]
  );

const useKangurLobbyChatLifecycle = ({
  refresh,
  refreshAbortRef,
}: Pick<KangurLobbyChatRuntimeRefs, 'refreshAbortRef'> & {
  refresh: () => Promise<void>;
}): void => {
  useEffect(() => {
    void refresh();
    return () => {
      refreshAbortRef.current?.abort();
      refreshAbortRef.current = null;
    };
  }, [refresh, refreshAbortRef]);
};

const useKangurLobbyChatStream = ({
  enabled,
  hasLoadedOlderRef,
  isOnline,
  limit,
  setError,
  setIsLoading,
  setIsStreaming,
  setLastUpdatedAt,
  setMessages,
  setNextCursor,
  streamEnabled,
  streamRef,
}: Pick<
  KangurLobbyChatStateControllers,
  | 'setError'
  | 'setIsLoading'
  | 'setIsStreaming'
  | 'setLastUpdatedAt'
  | 'setMessages'
  | 'setNextCursor'
> &
  Pick<KangurLobbyChatRuntimeRefs, 'hasLoadedOlderRef' | 'streamRef'> & {
    enabled: boolean;
    isOnline: boolean;
    limit: number;
    streamEnabled: boolean;
  }): void => {
  useEffect(() => {
    if (!canUseKangurLobbyChatStream({ enabled, isOnline, streamEnabled })) {
      setIsStreaming(false);
      return;
    }

    const source = openKangurLobbyChatStream(limit);
    if (!source) {
      return;
    }

    streamRef.current = source;
    setIsStreaming(true);

    const closeStream = (): void => {
      closeKangurLobbyChatStream({
        setIsStreaming,
        source,
        streamRef,
      });
    };

    source.onmessage = (event: MessageEvent<string>): void => {
      const payload = parseKangurLobbyChatStreamPayload(event);
      if (!payload || payload.type === 'heartbeat' || payload.type === 'ready') {
        return;
      }
      if (payload.type === 'fallback') {
        closeStream();
        return;
      }
      if (payload.type === 'snapshot') {
        applyKangurLobbyChatSnapshotPayload({
          hasLoadedOlderRef,
          payloadData: payload.data,
          setError,
          setIsLoading,
          setLastUpdatedAt,
          setMessages,
          setNextCursor,
        });
        return;
      }
      if (payload.type === 'message') {
        applyKangurLobbyChatMessagePayload({
          payloadData: payload.data,
          setMessages,
        });
      }
    };

    source.onerror = (): void => {
      closeStream();
    };

    return () => {
      closeStream();
    };
  }, [
    enabled,
    hasLoadedOlderRef,
    isOnline,
    limit,
    setError,
    setIsLoading,
    setIsStreaming,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
    streamEnabled,
    streamRef,
  ]);
};

export const useKangurLobbyChat = (
  options: UseKangurLobbyChatOptions = {}
): UseKangurLobbyChatResult => {
  const enabled = resolveKangurLobbyChatEnabled(options);
  const isOnline = resolveKangurLobbyChatOnline(options);
  const limit = resolveKangurLobbyChatLimit(options);
  const refreshIntervalMs = resolveKangurLobbyChatRefreshIntervalMs(options);
  const streamEnabled = resolveKangurLobbyChatStreamEnabled(options);

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

  const refresh = useKangurLobbyChatRefresh({
    enabled,
    hasLoadedOlderRef,
    isOnline,
    limit,
    refreshAbortRef,
    setError,
    setIsLoading,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
  });
  const loadOlder = useKangurLobbyChatLoadOlder({
    enabled,
    hasLoadedOlderRef,
    isLoadingOlder,
    isOnline,
    limit,
    nextCursor,
    setError,
    setIsLoadingOlder,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
  });
  const sendMessage = useKangurLobbyChatSendMessage({
    setError,
    setIsSending,
    setLastUpdatedAt,
    setMessages,
  });

  useKangurLobbyChatLifecycle({
    refresh,
    refreshAbortRef,
  });

  useInterval(
    () => {
      if (!isStreaming) {
        void refresh();
      }
    },
    resolveKangurLobbyChatPollInterval({
      enabled,
      isOnline,
      isStreaming,
      refreshIntervalMs,
    })
  );

  useKangurLobbyChatStream({
    enabled,
    hasLoadedOlderRef,
    isOnline,
    limit,
    setError,
    setIsLoading,
    setIsStreaming,
    setLastUpdatedAt,
    setMessages,
    setNextCursor,
    streamEnabled,
    streamRef,
  });

  return {
    messages,
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

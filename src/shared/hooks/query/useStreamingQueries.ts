'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { type SafeTimeout } from '@/shared/lib/runtime/timeout';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

interface StreamConfig<T = unknown> {
  endpoint: string;
  onMessage?: (data: T) => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  domain?: TanstackFactoryDomain;
}

// Hook for streaming data with automatic reconnection
export function useStreamingQuery<T>(
  queryKey: unknown[],
  config: StreamConfig<T>
): UseQueryResult<T | null, Error> {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = config.reconnectAttempts || 5;
  const reconnectDelay = config.reconnectDelay || 1000;
  const domain = config.domain ?? 'global';

  const connect = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(config.endpoint);

    eventSourceRef.current.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data as string) as T;
        queryClient.setQueryData(queryKey, data);
        config.onMessage?.(data);
        reconnectAttemptsRef.current = 0; // Reset on successful message
      } catch (error) {
        logClientCatch(error, {
          source: 'useStreamingQuery',
          action: 'parseStreamingData',
          level: 'warn',
        });
      }
    };

    eventSourceRef.current.onerror = (): void => {
      config.onError?.(new Error('Streaming connection failed'));

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        setTimeout(
          (): void => {
            connect();
          },
          reconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
        ) as SafeTimeout;
      }
    };
  }, [config, queryKey, queryClient, maxReconnectAttempts, reconnectDelay]);

  useEffect((): (() => void) => {
    connect();
    return (): void => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return createListQueryV2<T | null, T | null>({
    queryKey,
    queryFn: async (): Promise<T | null> => await Promise.resolve(null), // Initial empty state
    enabled: false, // Disable automatic fetching since we use streaming
    meta: {
      source: 'shared.hooks.query.useStreamingQuery',
      operation: 'list',
      resource: 'streaming-query',
      domain,
      tags: ['streaming'],
      description: 'Loads streaming query.'},
  });
}

// Hook for WebSocket-based real-time queries
export function useWebSocketQuery<T>(
  queryKey: unknown[],
  wsUrl: string,
  options?: {
    onMessage?: (data: T) => void;
    onError?: (error: Event) => void;
    reconnect?: boolean;
    domain?: TanstackFactoryDomain;
  }
): {
  sendMessage: (message: unknown) => void;
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback((): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data as string) as T;
        queryClient.setQueryData(queryKey, data);
        options?.onMessage?.(data);
      } catch (error) {
        logClientCatch(error, {
          source: 'useWebSocketQuery',
          action: 'parseWebSocketData',
          level: 'warn',
        });
      }
    };

    wsRef.current.onerror = (error: Event): void => {
      logClientError(new Error('WebSocket error'), {
        context: { source: 'WebSocketQuery', url: wsUrl, queryKey },
      });
      options?.onError?.(error);
    };

    wsRef.current.onclose = (): void => {
      if (options?.reconnect !== false) {
        reconnectTimeoutRef.current = setTimeout((): void => {
          connect();
        }, 3000) as SafeTimeout;
      }
    };
  }, [wsUrl, queryKey, queryClient, options]);

  useEffect((): (() => void) => {
    connect();
    return (): void => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: unknown): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

// Hook for polling with smart intervals
export function useSmartPolling<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    baseInterval?: number;
    maxInterval?: number;
    backoffMultiplier?: number;
    stopOnError?: boolean;
    visibilityAware?: boolean;
    domain?: TanstackFactoryDomain;
  }
): UseQueryResult<T, Error> {
  const baseInterval = options?.baseInterval || 5000;
  const maxInterval = options?.maxInterval || 60000;
  const backoffMultiplier = options?.backoffMultiplier || 1.5;
  const intervalRef = useRef(baseInterval);
  const errorCountRef = useRef(0);
  const domain = options?.domain ?? 'global';

  const query = createListQueryV2<T, T>({
    queryKey,
    queryFn,
    refetchInterval: (): number | false => {
      // Don't poll when page is hidden
      if (options?.visibilityAware && document.hidden) {
        return false;
      }
      return intervalRef.current;
    },
    refetchIntervalInBackground: !options?.visibilityAware,
    meta: {
      source: 'shared.hooks.query.useSmartPolling',
      operation: 'polling',
      resource: 'smart-polling',
      domain,
      tags: ['polling', 'smart'],
      description: 'Polls smart polling.'},
  });

  useEffect((): void => {
    if (query.isSuccess) {
      intervalRef.current = baseInterval;
      errorCountRef.current = 0;
    }
    if (query.isError) {
      errorCountRef.current++;
      // Increase interval on error (exponential backoff)
      intervalRef.current = Math.min(intervalRef.current * backoffMultiplier, maxInterval);
    }
  }, [query.isSuccess, query.isError, baseInterval, backoffMultiplier, maxInterval]);

  return query;
}

/* eslint-disable */
"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { logClientError } from "@/features/observability";

interface StreamConfig {
  endpoint: string;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

// Hook for streaming data with automatic reconnection
export function useStreamingQuery<T>(
  queryKey: unknown[],
  config: StreamConfig
): UseQueryResult<T | null, Error> {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = config.reconnectAttempts || 5;
  const reconnectDelay = config.reconnectDelay || 1000;

  const connect = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(config.endpoint);

    eventSourceRef.current.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data) as T;
        queryClient.setQueryData(queryKey, data);
        config.onMessage?.(data);
        reconnectAttemptsRef.current = 0; // Reset on successful message
      } catch (error) {
        console.warn('Failed to parse streaming data:', error);
      }
    };

    eventSourceRef.current.onerror = (): void => {
      config.onError?.(new Error('Streaming connection failed'));

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        setTimeout((): void => {
          connect();
        }, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current));
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

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T | null> => await Promise.resolve(null), // Initial empty state
    enabled: false, // Disable automatic fetching since we use streaming
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
  }
): {
  sendMessage: (message: any) => void;
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
        const data = JSON.parse(event.data) as T;
        queryClient.setQueryData(queryKey, data);
        options?.onMessage?.(data);
      } catch (error) {
        console.warn('Failed to parse WebSocket data:', error);
      }
    };

    wsRef.current.onerror = (error: Event): void => {
      logClientError(error, { context: { source: "WebSocketQuery", url: wsUrl, queryKey } });
      console.error('WebSocket error:', error);
      options?.onError?.(error);
    };

    wsRef.current.onclose = (): void => {
      if (options?.reconnect !== false) {
        reconnectTimeoutRef.current = setTimeout((): void => {
          connect();
        }, 3000);
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

  const sendMessage = useCallback((message: any): void => {
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
  }
): UseQueryResult<T, Error> {
  const baseInterval = options?.baseInterval || 5000;
  const maxInterval = options?.maxInterval || 60000;
  const backoffMultiplier = options?.backoffMultiplier || 1.5;
  const intervalRef = useRef(baseInterval);
  const errorCountRef = useRef(0);

  const query = useQuery({
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
  });

  useEffect((): void => {
    if (query.isSuccess) {
      intervalRef.current = baseInterval;
      errorCountRef.current = 0;
    }
    if (query.isError) {
      errorCountRef.current++;
      // Increase interval on error (exponential backoff)
      intervalRef.current = Math.min(
        intervalRef.current * backoffMultiplier,
        maxInterval
      );
    }
  }, [query.isSuccess, query.isError, baseInterval, backoffMultiplier, maxInterval]);

  return query;
}

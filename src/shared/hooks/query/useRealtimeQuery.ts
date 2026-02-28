'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface RealtimeConfig {
  queryKey?: readonly unknown[];
  interval?: number;
  enabled?: boolean;
  onUpdate?: (data: unknown) => void;
}

// Hook for real-time data updates with WebSocket fallback to polling
export function useRealtimeQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  config?: RealtimeConfig
): UseQueryResult<TData, Error> {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const query = createListQueryV2<TData, TData>({
    queryKey,
    queryFn,
    enabled: config?.enabled !== false,
    refetchInterval: config?.interval || 30000, // Fallback polling
    refetchIntervalInBackground: true,
    meta: {
      source: 'shared.hooks.query.useRealtimeQuery',
      operation: 'polling',
      resource: 'realtime-query',
      domain: 'global',
      tags: ['realtime', 'polling'],
    },
  });

  useEffect((): (() => void) => {
    if (config?.enabled === false) return (): void => {};

    // Try WebSocket connection first
    const wsUrl = `ws://localhost:3000/ws/${JSON.stringify(queryKey)}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data as string) as unknown;
          queryClient.setQueryData(queryKey as unknown[], data);
          config?.onUpdate?.(data);
        } catch (error) {
          logClientError(error instanceof Error ? error : new Error(String(error)), {
            context: { source: 'useRealtimeQuery', action: 'parseWebSocketData', level: 'warn' },
          });
        }
      };

      wsRef.current.onerror = (): void => {
        // Fallback to polling if WebSocket fails
      };
    } catch {
      // WebSocket not available, use polling
    }

    const currentInterval = intervalRef.current;
    return (): void => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (currentInterval) {
        clearInterval(currentInterval);
      }
    };
  }, [queryKey, queryClient, config]);

  return query;
}

// Hook for server-sent events
export function useServerSentEvents<TData>(
  queryKey: readonly unknown[],
  endpoint: string,
  config?: { enabled?: boolean; onUpdate?: (data: TData) => void }
): void {
  const queryClient = useQueryClient();

  useEffect((): (() => void) => {
    if (config?.enabled === false) return (): void => {};

    const eventSource = new EventSource(endpoint);

    eventSource.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data as string) as TData;
        queryClient.setQueryData(queryKey as unknown[], data);
        config?.onUpdate?.(data);
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), {
          context: { source: 'useServerSentEvents', action: 'parseSSEData', level: 'warn' },
        });
      }
    };

    eventSource.onerror = (error: Event): void => {
      logClientError(new Error(String(error)), {
        context: { source: 'useServerSentEvents', action: 'sseConnectionError', level: 'warn' },
      });
    };

    return (): void => {
      eventSource.close();
    };
  }, [queryKey, endpoint, queryClient, config]);
}

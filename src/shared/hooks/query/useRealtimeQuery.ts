 
"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: config?.enabled !== false,
    refetchInterval: config?.interval || 30000, // Fallback polling
    refetchIntervalInBackground: true,
  });

  useEffect((): (() => void) => {
    if (config?.enabled === false) return (): void => {};

    // Try WebSocket connection first
    const wsUrl = `ws://localhost:3000/ws/${JSON.stringify(queryKey)}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data) as unknown;
          queryClient.setQueryData(queryKey as unknown[], data);
          config?.onUpdate?.(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket data:', error);
        }
      };

      wsRef.current.onerror = (): void => {
        // Fallback to polling if WebSocket fails
        console.log('WebSocket failed, using polling fallback');
      };

    } catch (_error) {
      // WebSocket not available, use polling
      console.log('WebSocket not available, using polling');
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
        const data = JSON.parse(event.data) as TData;
        queryClient.setQueryData(queryKey as unknown[], data);
        config?.onUpdate?.(data);
      } catch (error) {
        console.warn('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = (error: Event): void => {
      console.warn('SSE connection error:', error);
    };

    return (): void => {
      eventSource.close();
    };
  }, [queryKey, endpoint, queryClient, config]);
}

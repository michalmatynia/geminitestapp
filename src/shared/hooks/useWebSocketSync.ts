import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface WebSocketSyncOptions {
  url: string;
  queryKeys: unknown[][];
  enabled?: boolean;
}

export function useWebSocketSync({ url, queryKeys, enabled = true }: WebSocketSyncOptions): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const ws: WebSocket = new WebSocket(url);

    ws.onmessage = (event: MessageEvent): void => {
      try {
        const data: { type?: string; queryKey?: unknown[] } = JSON.parse(event.data as string) as { type?: string; queryKey?: unknown[] };
        
        // Invalidate relevant queries based on the update type
        if (data.type && data.queryKey) {
          void queryClient.invalidateQueries({ queryKey: data.queryKey });
        } else {
          // Fallback: invalidate all registered query keys
          queryKeys.forEach((queryKey: unknown[]) => {
            void queryClient.invalidateQueries({ queryKey });
          });
        }
      } catch (error: unknown) {
        console.warn("WebSocket message parsing failed:", error);
      }
    };

    ws.onerror = (error: Event): void => {
      console.warn("WebSocket error:", error);
    };

    return (): void => {
      ws.close();
    };
  }, [url, queryKeys, enabled, queryClient]);
}

// Hook for AI job updates via WebSocket
export function useAiJobWebSocketSync(enabled: boolean = true): void {
  return useWebSocketSync({
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ai-jobs/ws`,
    queryKeys: [
      ["ai-jobs"],
      ["product-ai-jobs"],
      ["chatbot-jobs"],
    ],
    enabled,
  });
}
'use client';

import { useCallback, useRef } from 'react';

import { api } from '@/shared/lib/api-client';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';

import type { SequenceRunStatus, SequenceRunDetailResponse } from './sequencing-types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const POLL_INTERVAL_MS = 1500;
const ENABLE_SEQUENCE_SSE = process.env['NEXT_PUBLIC_IMAGE_STUDIO_SEQUENCE_SSE'] !== 'false';

export interface UseSequenceMonitorProps {
  onApplyRunSnapshot: (snapshot: SequenceRunDetailResponse) => Promise<void>;
  onSetActiveSequenceStatus: (status: SequenceRunStatus | null) => void;
  onSetSequenceError: (error: string | null) => void;
}

export function useSequenceMonitor({
  onApplyRunSnapshot,
  onSetActiveSequenceStatus,
  onSetSequenceError,
}: UseSequenceMonitorProps) {
  const pollTimerRef = useRef<SafeTimerId | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      safeClearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const fetchRunSnapshot = useCallback(
    async (runId: string): Promise<SequenceRunDetailResponse | null> => {
      try {
        const response = await api.get<SequenceRunDetailResponse>(
          `/api/image-studio/sequences/${encodeURIComponent(runId)}`,
          { cache: 'no-store', logError: false }
        );
        if (!response.run) return null;
        return response;
      } catch (error) {
        logClientError(error);
        onSetActiveSequenceStatus('failed');
        onSetSequenceError(error instanceof Error ? error.message : 'Sequence polling failed.');
        return null;
      }
    },
    [onSetActiveSequenceStatus, onSetSequenceError]
  );

  const pollRun = useCallback(
    (runId: string): void => {
      stopPolling();
      stopStreaming();

      const tick = async (): Promise<void> => {
        const snapshot = await fetchRunSnapshot(runId);
        if (!snapshot) {
          stopPolling();
          return;
        }
        await onApplyRunSnapshot(snapshot);
      };

      void tick();
      pollTimerRef.current = safeSetInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    [fetchRunSnapshot, onApplyRunSnapshot, stopPolling, stopStreaming]
  );

  const monitorRun = useCallback(
    (runId: string): void => {
      if (!ENABLE_SEQUENCE_SSE || typeof EventSource === 'undefined') {
        pollRun(runId);
        return;
      }

      stopPolling();
      stopStreaming();

      let source: EventSource;
      try {
        source = new EventSource(`/api/image-studio/sequences/${encodeURIComponent(runId)}/stream`);
      } catch (error) {
        logClientError(error);
        pollRun(runId);
        return;
      }
      streamRef.current = source;

      const fallbackToPolling = (): void => {
        if (streamRef.current !== source) return;
        source.close();
        streamRef.current = null;
        pollRun(runId);
      };

      const refresh = (): void => {
        void fetchRunSnapshot(runId).then((snapshot) => {
          if (!snapshot) return;
          void onApplyRunSnapshot(snapshot);
        });
      };

      source.onopen = () => {
        refresh();
      };
      source.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === 'heartbeat') return;
          if (payload.type === 'fallback') {
            fallbackToPolling();
            return;
          }
        } catch (error) {
          logClientError(error);
        
          // Signal refresh
        }
        refresh();
      };
      source.onerror = () => {
        fallbackToPolling();
      };
    },
    [fetchRunSnapshot, onApplyRunSnapshot, pollRun, stopPolling, stopStreaming]
  );

  return {
    monitorRun,
    stopPolling,
    stopStreaming,
    fetchRunSnapshot,
  };
}

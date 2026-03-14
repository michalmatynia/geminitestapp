'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';
import {
  getRecentAiPathRunEnqueue,
  rememberRecentAiPathRunEnqueue,
} from '@/shared/lib/query-invalidation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  getLatestEventTimestamp,
  normalizeRunEvents,
  normalizeRunNodes,
  refreshRunDetailErrorSummary,
} from './job-queue-panel-utils';

import type { QueueHistoryEntry, QueueStatus, RunDetail, StreamConnectionStatus } from './job-queue-panel-utils';
import type { JobQueueRefetchData } from './useJobQueueDataLayer';

interface JobQueueRealtimeParams {
  expandedRunIds: Set<string>;
  isDocumentVisible: boolean;
  isPanelActive: boolean;
  isWindowFocused: boolean;
  queueStatus: QueueStatus | undefined;
  refetchQueueData: JobQueueRefetchData;
  rememberVisibleOptimisticRun: (run: AiPathRunRecord) => void;
  runDetails: Record<string, RunDetail | null>;
  setRunDetails: Dispatch<SetStateAction<Record<string, RunDetail | null>>>;
}

interface JobQueueRealtimeResult {
  handleToggleStream: (runId: string) => void;
  pauseAllStreams: () => void;
  pausedStreams: Set<string>;
  queueHistory: QueueHistoryEntry[];
  resumeAllStreams: () => void;
  setQueueHistory: Dispatch<SetStateAction<QueueHistoryEntry[]>>;
  streamStatuses: Record<string, StreamConnectionStatus>;
}

export function useJobQueueRealtime({
  expandedRunIds,
  isDocumentVisible,
  isPanelActive,
  isWindowFocused,
  queueStatus,
  refetchQueueData,
  rememberVisibleOptimisticRun,
  runDetails,
  setRunDetails,
}: JobQueueRealtimeParams): JobQueueRealtimeResult {
  const [streamStatuses, setStreamStatuses] = useState<Record<string, StreamConnectionStatus>>({});
  const [pausedStreams, setPausedStreams] = useState<Set<string>>(new Set());
  const [queueHistory, setQueueHistory] = useState<QueueHistoryEntry[]>([]);

  const streamSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const lastHandledRecentEnqueueKeyRef = useRef<string | null>(null);
  const previousQueueSignatureRef = useRef<string | null>(null);

  const handleToggleStream = useCallback((runId: string): void => {
    const source = streamSourcesRef.current.get(runId);
    if (source) {
      source.close();
      streamSourcesRef.current.delete(runId);
      setPausedStreams((prev) => new Set(prev).add(runId));
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'paused' }));
    } else {
      setPausedStreams((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'connecting' }));
    }
  }, []);

  const pauseAllStreams = useCallback((): void => {
    const expandedIds = Array.from(expandedRunIds);
    if (expandedIds.length === 0) return;
    setPausedStreams(new Set(expandedIds));
    streamSourcesRef.current.forEach((source) => source.close());
    streamSourcesRef.current.clear();
    setStreamStatuses((prev) => {
      const next = { ...prev };
      expandedIds.forEach((id) => {
        next[id] = 'paused';
      });
      return next;
    });
  }, [expandedRunIds]);

  const resumeAllStreams = useCallback((): void => {
    if (expandedRunIds.size === 0) return;
    setPausedStreams(new Set());
    setStreamStatuses((prev) => {
      const next = { ...prev };
      expandedRunIds.forEach((id) => {
        next[id] = 'connecting';
      });
      return next;
    });
  }, [expandedRunIds]);

  useEffect(() => {
    const sources = streamSourcesRef.current;
    return (): void => {
      sources.forEach((source) => source.close());
      sources.clear();
    };
  }, []);

  useEffect(() => {
    if (!queueStatus) return;
    const signature = JSON.stringify({
      queuedCount: queueStatus.queuedCount ?? 0,
      activeRuns: queueStatus.activeRuns ?? 0,
      waitingCount: queueStatus.waitingCount ?? 0,
      delayedCount: queueStatus.delayedCount ?? 0,
      failedCount: queueStatus.failedCount ?? 0,
    });
    if (
      previousQueueSignatureRef.current !== null &&
      previousQueueSignatureRef.current !== signature &&
      isPanelActive
    ) {
      refetchQueueData({
        fresh: true,
        includeQueueStatus: false,
        markBurst: true,
      });
    }
    const hasSignatureChanged = previousQueueSignatureRef.current !== signature;
    previousQueueSignatureRef.current = signature;
    if (!hasSignatureChanged) return;
    setQueueHistory((prev) => {
      const next = [
        ...prev,
        {
          ts: Date.now(),
          queued: queueStatus.queuedCount ?? 0,
          lagMs: queueStatus.queueLagMs ?? null,
          throughput: queueStatus.throughputPerMinute ?? null,
        },
      ];
      return next.slice(-120);
    });
  }, [isPanelActive, queueStatus, refetchQueueData]);

  useEffect(() => {
    if (!isPanelActive || !isDocumentVisible || !isWindowFocused) return;
    const recentEnqueue = getRecentAiPathRunEnqueue();
    if (!recentEnqueue) return;
    const enqueueKey = `${recentEnqueue.runId}:${recentEnqueue.at}`;
    if (lastHandledRecentEnqueueKeyRef.current === enqueueKey) return;
    lastHandledRecentEnqueueKeyRef.current = enqueueKey;
    refetchQueueData({ fresh: true, markBurst: true });
  }, [isDocumentVisible, isPanelActive, isWindowFocused, refetchQueueData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rememberEnqueue = (payload: { runId: string; at?: number }): void => {
      const at =
        typeof payload.at === 'number' && Number.isFinite(payload.at) ? payload.at : Date.now();
      const normalizedPayload = { ...payload, at };
      const enqueueKey = `${payload.runId}:${at}`;
      rememberRecentAiPathRunEnqueue(normalizedPayload);
      if (isPanelActive && isDocumentVisible && isWindowFocused) {
        lastHandledRecentEnqueueKeyRef.current = enqueueKey;
      }
    };

    const refreshQueueViews = (): void => {
      if (!isPanelActive) return;
      refetchQueueData({ fresh: true, markBurst: true });
    };

    const handleWindowEvent = (event: Event): void => {
      const payload = parseAiPathRunEnqueuedEventPayload((event as CustomEvent<unknown>).detail);
      if (!payload) return;
      rememberEnqueue(payload);
      if (payload.run) {
        rememberVisibleOptimisticRun(payload.run);
      }
      refreshQueueViews();
    };

    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handleWindowEvent as EventListener);

    let channel: BroadcastChannel | null = null;
    const BroadcastChannelCtor = window.BroadcastChannel;
    if (typeof BroadcastChannelCtor === 'function') {
      try {
        channel = new BroadcastChannelCtor(AI_PATH_RUN_QUEUE_CHANNEL);
        channel.onmessage = (event) => {
          const payload = parseAiPathRunEnqueuedEventPayload(event.data);
          if (!payload) return;
          rememberEnqueue(payload);
          if (payload.run) {
            rememberVisibleOptimisticRun(payload.run);
          }
          refreshQueueViews();
        };
      } catch {
        channel = null;
      }
    }

    return (): void => {
      window.removeEventListener(
        AI_PATH_RUN_ENQUEUED_EVENT_NAME,
        handleWindowEvent as EventListener
      );
      if (channel) {
        channel.close();
      }
    };
  }, [
    isDocumentVisible,
    isPanelActive,
    isWindowFocused,
    refetchQueueData,
    rememberVisibleOptimisticRun,
  ]);

  useEffect(() => {
    streamSourcesRef.current.forEach((source, runId) => {
      if (!expandedRunIds.has(runId)) {
        source.close();
        streamSourcesRef.current.delete(runId);
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'stopped' }));
      }
    });

    expandedRunIds.forEach((runId) => {
      if (streamSourcesRef.current.has(runId)) return;
      if (pausedStreams.has(runId)) return;

      const existing = runDetails[runId];
      const since = existing ? getLatestEventTimestamp(existing.events) : null;
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      const url = `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream${params.toString() ? `?${params.toString()}` : ''}`;

      const source = new EventSource(url);
      streamSourcesRef.current.set(runId, source);
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'connecting' }));

      source.addEventListener('ready', () => {
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'live' }));
      });

      source.addEventListener('run', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as AiPathRunRecord;
          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                run: payload,
              }),
            };
          });
        } catch (error) {
          logClientError(error, {
            context: {
              service: 'ai-paths',
              action: 'parseRunStreamPayload',
              runId,
            },
          });
        }      });

      source.addEventListener('nodes', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as unknown;
          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                nodes: normalizeRunNodes(payload),
              }),
            };
          });
        } catch (error) {
          logClientError(error, {
            context: {
              service: 'ai-paths',
              action: 'parseNodesStreamPayload',
              runId,
            },
          });
        }      });

      source.addEventListener('events', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as unknown;
          const incoming = Array.isArray(payload)
            ? payload
            : (payload as Record<string, unknown>)['events'] || [];
          const safeIncoming = normalizeRunEvents(incoming);
          if (safeIncoming.length === 0) return;

          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            const existingIds = new Set(current.events.map((entry) => entry.id));
            const merged = [...current.events];
            safeIncoming.forEach((entry) => {
              if (!existingIds.has(entry.id)) merged.push(entry);
            });
            merged.sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                events: merged,
              }),
            };
          });
        } catch (error) {
          logClientError(error, {
            context: {
              service: 'ai-paths',
              action: 'parseEventsStreamPayload',
              runId,
            },
          });
        }      });

      const cleanup = () => {
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'stopped' }));
        source.close();
        streamSourcesRef.current.delete(runId);
      };

      source.addEventListener('done', cleanup);
      source.addEventListener('error', cleanup);
    });
  }, [expandedRunIds, pausedStreams, runDetails, setRunDetails]);

  return {
    handleToggleStream,
    pauseAllStreams,
    pausedStreams,
    queueHistory,
    resumeAllStreams,
    setQueueHistory,
    streamStatuses,
  };
}

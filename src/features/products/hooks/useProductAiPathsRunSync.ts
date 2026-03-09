'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  AI_PATH_RUN_QUEUE_CHANNEL,
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { invalidateProductsCountsAndDetail } from '@/features/products/hooks/productCache';
import {
  buildQueuedProductAiRunSource,
  markQueuedProductSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';

// Keep the badge visible longer than the last scheduled product refresh (9 s).
const AI_PATH_RUN_BADGE_TTL_MS = 30_000;
const AI_PATH_RUN_STATUS_POLL_INTERVAL_MS = 2_000;
const MAX_RUN_POLL_FAILURES = 3;
const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);

const resolveTrackedProductRun = (detail: unknown): { runId: string; productId: string } | null => {
  const payload = parseAiPathRunEnqueuedEventPayload(detail);
  if (!payload) return null;
  const normalizedEntityType =
    typeof payload.entityType === 'string' ? payload.entityType.trim().toLowerCase() : null;
  if (normalizedEntityType !== 'product') return null;
  const normalizedProductId =
    typeof payload.entityId === 'string' ? payload.entityId.trim() : null;
  const normalizedRunId = typeof payload.runId === 'string' ? payload.runId.trim() : null;
  if (!normalizedProductId || !normalizedRunId) {
    return null;
  }
  return {
    runId: normalizedRunId,
    productId: normalizedProductId,
  };
};

const normalizeRunStatus = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const resolveRunStatusFromResponse = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const run = (value as { run?: unknown }).run;
  if (!run || typeof run !== 'object' || Array.isArray(run)) return null;
  return normalizeRunStatus((run as { status?: unknown }).status);
};

const hasTrackedProductRuns = (trackedRuns: Map<string, string>, productId: string): boolean => {
  for (const trackedProductId of trackedRuns.values()) {
    if (trackedProductId === productId) {
      return true;
    }
  }
  return false;
};

/**
 * Listens for AI-Paths runs triggered on individual products and reflects their
 * in-progress state in the product list's "Queued" badge + completion highlight.
 *
 * The event is dispatched by useAiPathTriggerEvent (shared lib) via a CustomEvent
 * so the shared layer never imports from the products feature.
 */
export function useProductAiPathsRunSync(): void {
  const queryClient = useQueryClient();
  const trackedRunsRef = useRef<Map<string, string>>(new Map());
  const pollingRunIdsRef = useRef<Set<string>>(new Set());
  const pollFailureCountsRef = useRef<Map<string, number>>(new Map());
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;

    const stopPolling = (): void => {
      if (pollingIntervalRef.current === null) return;
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    };

    const finalizeRun = (runId: string, productId: string): void => {
      trackedRunsRef.current.delete(runId);
      pollingRunIdsRef.current.delete(runId);
      pollFailureCountsRef.current.delete(runId);
      void invalidateProductsCountsAndDetail(queryClient, productId);
      const source = buildQueuedProductAiRunSource(runId);
      if (source) {
        removeQueuedProductSource(productId, source);
      }
      if (hasTrackedProductRuns(trackedRunsRef.current, productId)) {
        trackedRunsRef.current.forEach((trackedProductId: string, trackedRunId: string) => {
          if (trackedProductId !== productId) return;
          const trackedSource = buildQueuedProductAiRunSource(trackedRunId);
          if (!trackedSource) return;
          markQueuedProductSource(productId, trackedSource, AI_PATH_RUN_BADGE_TTL_MS);
        });
      }
      if (trackedRunsRef.current.size === 0) {
        stopPolling();
      }
    };

    const pollRun = async (runId: string): Promise<void> => {
      const initialProductId = trackedRunsRef.current.get(runId);
      if (!initialProductId || disposedRef.current) {
        pollingRunIdsRef.current.delete(runId);
        return;
      }

      try {
        const response = await getAiPathRun(runId);
        const currentProductId = trackedRunsRef.current.get(runId);
        if (!currentProductId || disposedRef.current) {
          return;
        }
        if (!response.ok) {
          finalizeRun(runId, currentProductId);
          return;
        }
        const status = resolveRunStatusFromResponse(response.data);
        if (!status || TERMINAL_RUN_STATUSES.has(status)) {
          finalizeRun(runId, currentProductId);
          return;
        }
        pollFailureCountsRef.current.delete(runId);
        const source = buildQueuedProductAiRunSource(runId);
        if (source) {
          markQueuedProductSource(currentProductId, source, AI_PATH_RUN_BADGE_TTL_MS);
        }
      } catch {
        const currentProductId = trackedRunsRef.current.get(runId);
        if (currentProductId && !disposedRef.current) {
          const nextFailureCount = (pollFailureCountsRef.current.get(runId) ?? 0) + 1;
          pollFailureCountsRef.current.set(runId, nextFailureCount);
          if (nextFailureCount >= MAX_RUN_POLL_FAILURES) {
            finalizeRun(runId, currentProductId);
            return;
          }
          const source = buildQueuedProductAiRunSource(runId);
          if (source) {
            markQueuedProductSource(currentProductId, source, AI_PATH_RUN_BADGE_TTL_MS);
          }
        }
      } finally {
        pollingRunIdsRef.current.delete(runId);
        if (trackedRunsRef.current.size === 0) {
          stopPolling();
        }
      }
    };

    const pollTrackedRuns = (): void => {
      trackedRunsRef.current.forEach((_productId, runId) => {
        if (pollingRunIdsRef.current.has(runId)) return;
        pollingRunIdsRef.current.add(runId);
        void pollRun(runId);
      });
    };

    const ensurePolling = (): void => {
      if (trackedRunsRef.current.size === 0 || pollingIntervalRef.current !== null) {
        return;
      }
      pollingIntervalRef.current = setInterval(
        pollTrackedRuns,
        AI_PATH_RUN_STATUS_POLL_INTERVAL_MS
      );
    };

    const trackRun = (runId: string, productId: string): void => {
      trackedRunsRef.current.set(runId, productId);
      pollFailureCountsRef.current.delete(runId);
      const source = buildQueuedProductAiRunSource(runId);
      if (source) {
        markQueuedProductSource(productId, source, AI_PATH_RUN_BADGE_TTL_MS);
      }
      ensurePolling();
      if (pollingRunIdsRef.current.has(runId)) return;
      pollingRunIdsRef.current.add(runId);
      void pollRun(runId);
    };

    const handlePayload = (payload: unknown): void => {
      const trackedRun = resolveTrackedProductRun(payload);
      if (!trackedRun) return;
      trackRun(trackedRun.runId, trackedRun.productId);
    };

    const handler = (event: Event): void => {
      handlePayload((event as CustomEvent<unknown>).detail);
    };

    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);

    let channel: BroadcastChannel | null = null;
    const BroadcastChannelCtor = window.BroadcastChannel;
    if (typeof BroadcastChannelCtor === 'function') {
      try {
        channel = new BroadcastChannelCtor(AI_PATH_RUN_QUEUE_CHANNEL);
        channel.onmessage = (event: MessageEvent<unknown>): void => {
          handlePayload(event.data);
        };
      } catch {
        channel = null;
      }
    }

    return () => {
      disposedRef.current = true;
      stopPolling();
      pollingRunIdsRef.current.clear();
      pollFailureCountsRef.current.clear();
      trackedRunsRef.current.clear();
      window.removeEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);
      channel?.close();
    };
  }, [queryClient]);
}

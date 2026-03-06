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
  markQueuedProductId,
  removeQueuedProductId,
} from '@/features/products/state/queued-product-ops';

// Keep the badge visible longer than the last scheduled product refresh (9 s).
const AI_PATH_RUN_BADGE_TTL_MS = 30_000;
const AI_PATH_RUN_STATUS_POLL_INTERVAL_MS = 2_000;
const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);

const resolveTrackedProductRun = (
  value: unknown
): { runId: string; productId: string } | null => {
  const payload = parseAiPathRunEnqueuedEventPayload(value);
  if (!payload || payload.entityType !== 'product' || !payload.entityId) {
    return null;
  }
  return {
    runId: payload.runId,
    productId: payload.entityId,
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

const hasTrackedProductRuns = (
  trackedRuns: Map<string, string>,
  productId: string
): boolean => {
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
      void invalidateProductsCountsAndDetail(queryClient, productId);
      if (hasTrackedProductRuns(trackedRunsRef.current, productId)) {
        markQueuedProductId(productId, AI_PATH_RUN_BADGE_TTL_MS);
      } else {
        removeQueuedProductId(productId);
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
        if (!response.ok) {
          throw new Error(response.error);
        }
        const currentProductId = trackedRunsRef.current.get(runId);
        if (!currentProductId || disposedRef.current) {
          return;
        }
        const status = resolveRunStatusFromResponse(response.data);
        if (status && TERMINAL_RUN_STATUSES.has(status)) {
          finalizeRun(runId, currentProductId);
          return;
        }
        markQueuedProductId(currentProductId, AI_PATH_RUN_BADGE_TTL_MS);
      } catch {
        const currentProductId = trackedRunsRef.current.get(runId);
        if (currentProductId && !disposedRef.current) {
          markQueuedProductId(currentProductId, AI_PATH_RUN_BADGE_TTL_MS);
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
      markQueuedProductId(productId, AI_PATH_RUN_BADGE_TTL_MS);
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

    const handleWindowEvent = (event: Event): void => {
      handlePayload((event as CustomEvent<unknown>).detail);
    };

    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handleWindowEvent);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(AI_PATH_RUN_QUEUE_CHANNEL);
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
      trackedRunsRef.current.clear();
      window.removeEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handleWindowEvent);
      channel?.close();
    };
  }, [queryClient]);
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { invalidateProductsCountsAndDetail } from '@/features/products/hooks/productCache';
import {
  buildProductAiRunFeedbackFromSnapshot,
  compareProductAiRunFeedback,
  type ProductAiRunFeedback,
} from '@/features/products/lib/product-ai-run-feedback';
import {
  buildQueuedProductAiRunSource,
  markQueuedProductSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import {
  AI_PATH_RUN_QUEUE_CHANNEL,
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';
import {
  type TrackedAiPathRunSnapshot,
  isTrackedAiPathRunTerminal,
  subscribeToTrackedAiPathRun,
} from '@/shared/lib/ai-paths/client-run-tracker';
import { getRecentAiPathRunEnqueue } from '@/shared/lib/query-invalidation';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


// Keep the badge visible longer than the last scheduled product refresh (9 s).
const AI_PATH_RUN_BADGE_TTL_MS = 30_000;
const AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS = 10_000;
const EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID = new Map<string, ProductAiRunFeedback>();

type TrackedProductRun = {
  productId: string;
  latestSnapshot: TrackedAiPathRunSnapshot | null;
  unsubscribe: () => void;
};

const resolveTrackedProductRun = (detail: unknown): { runId: string; productId: string } | null => {
  const payload = parseAiPathRunEnqueuedEventPayload(detail);
  if (!payload) return null;
  if (payload.entityType !== 'product') return null;
  if (!payload.entityId || !payload.runId) {
    return null;
  }
  return {
    runId: payload.runId,
    productId: payload.entityId,
  };
};

const hasTrackedProductRuns = (
  trackedRuns: Map<string, TrackedProductRun>,
  productId: string
): boolean => {
  for (const trackedRun of trackedRuns.values()) {
    if (trackedRun.productId === productId) {
      return true;
    }
  }
  return false;
};

const buildProductAiRunStatusByProductId = (
  trackedRuns: ReadonlyMap<string, TrackedProductRun>
): ReadonlyMap<string, ProductAiRunFeedback> => {
  const next = new Map<string, ProductAiRunFeedback>();

  trackedRuns.forEach((trackedRun: TrackedProductRun) => {
    const snapshot = trackedRun.latestSnapshot;
    if (!snapshot || snapshot.trackingState === 'stopped' || isTrackedAiPathRunTerminal(snapshot)) {
      return;
    }

    const feedback = buildProductAiRunFeedbackFromSnapshot(snapshot);
    if (!feedback) return;

    const current = next.get(trackedRun.productId);
    if (!current || compareProductAiRunFeedback(feedback, current) > 0) {
      next.set(trackedRun.productId, feedback);
    }
  });

  return next;
};

/**
 * Listens for AI-Paths runs triggered on individual products and reflects their
 * in-progress state in the product list's run badge + completion highlight.
 *
 * The event is dispatched by useAiPathTriggerEvent (shared lib) via a CustomEvent
 * so the shared layer never imports from the products feature.
 */
export function useProductAiPathsRunSync(): ReadonlyMap<string, ProductAiRunFeedback> {
  const queryClient = useQueryClient();
  const trackedRunsRef = useRef<Map<string, TrackedProductRun>>(new Map());
  const badgeRefreshIntervalRef = useRef<SafeTimerId | null>(null);
  const disposedRef = useRef(false);
  const [productAiRunStatusByProductId, setProductAiRunStatusByProductId] = useState<
    ReadonlyMap<string, ProductAiRunFeedback>
  >(() => EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID);

  useEffect(() => {
    disposedRef.current = false;

    const syncProductAiRunStatuses = (): void => {
      setProductAiRunStatusByProductId(
        buildProductAiRunStatusByProductId(trackedRunsRef.current)
      );
    };

    const stopBadgeRefresh = (): void => {
      if (badgeRefreshIntervalRef.current === null) return;
      safeClearInterval(badgeRefreshIntervalRef.current);
      badgeRefreshIntervalRef.current = null;
    };

    const refreshQueuedBadge = (runId: string, productId: string): void => {
      const source = buildQueuedProductAiRunSource(runId);
      if (!source) return;
      markQueuedProductSource(productId, source, AI_PATH_RUN_BADGE_TTL_MS);
    };

    const finalizeRun = (runId: string, productId: string): void => {
      const trackedRun = trackedRunsRef.current.get(runId);
      trackedRun?.unsubscribe();
      trackedRunsRef.current.delete(runId);
      void invalidateProductsCountsAndDetail(queryClient, productId);
      const source = buildQueuedProductAiRunSource(runId);
      if (source) {
        removeQueuedProductSource(productId, source);
      }
      if (hasTrackedProductRuns(trackedRunsRef.current, productId)) {
        trackedRunsRef.current.forEach((candidate: TrackedProductRun, trackedRunId: string) => {
          if (candidate.productId !== productId) return;
          refreshQueuedBadge(trackedRunId, productId);
        });
      }
      if (trackedRunsRef.current.size === 0) {
        stopBadgeRefresh();
      }
      syncProductAiRunStatuses();
    };

    const refreshTrackedRunBadges = (): void => {
      trackedRunsRef.current.forEach((trackedRun: TrackedProductRun, runId: string) => {
        if (trackedRun.latestSnapshot?.trackingState === 'stopped') return;
        if (trackedRun.latestSnapshot && isTrackedAiPathRunTerminal(trackedRun.latestSnapshot)) {
          return;
        }
        refreshQueuedBadge(runId, trackedRun.productId);
      });
    };

    const ensureBadgeRefresh = (): void => {
      if (trackedRunsRef.current.size === 0 || badgeRefreshIntervalRef.current !== null) {
        return;
      }
      badgeRefreshIntervalRef.current = safeSetInterval(
        refreshTrackedRunBadges,
        AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS
      );
    };

    const trackRun = (runId: string, productId: string): void => {
      const existingTrackedRun = trackedRunsRef.current.get(runId);
      if (existingTrackedRun) {
        existingTrackedRun.productId = productId;
        refreshQueuedBadge(runId, productId);
        ensureBadgeRefresh();
        syncProductAiRunStatuses();
        return;
      }

      const trackedRun: TrackedProductRun = {
        productId,
        latestSnapshot: null,
        unsubscribe: () => {},
      };
      trackedRunsRef.current.set(runId, trackedRun);

      const unsubscribe = subscribeToTrackedAiPathRun(
        runId,
        (snapshot: TrackedAiPathRunSnapshot): void => {
          if (disposedRef.current) return;

          const activeTrackedRun = trackedRunsRef.current.get(runId);
          if (!activeTrackedRun) return;

          activeTrackedRun.latestSnapshot = snapshot;

          if (snapshot.trackingState === 'stopped' || isTrackedAiPathRunTerminal(snapshot)) {
            finalizeRun(runId, activeTrackedRun.productId);
            return;
          }

          refreshQueuedBadge(runId, activeTrackedRun.productId);
          syncProductAiRunStatuses();
        },
        {
          initialSnapshot: {
            runId,
            status: 'queued',
            entityId: productId,
            entityType: 'product',
          },
        }
      );

      const activeTrackedRun = trackedRunsRef.current.get(runId);
      if (activeTrackedRun === trackedRun) {
        activeTrackedRun.unsubscribe = unsubscribe;
        ensureBadgeRefresh();
        return;
      }

      unsubscribe();
    };

    const handlePayload = (payload: unknown): void => {
      const trackedRun = resolveTrackedProductRun(payload);
      if (!trackedRun) return;
      trackRun(trackedRun.runId, trackedRun.productId);
    };

    const handler = (event: Event): void => {
      handlePayload((event as CustomEvent<unknown>).detail);
    };

    handlePayload(getRecentAiPathRunEnqueue());

    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);

    let channel: BroadcastChannel | null = null;
    const BroadcastChannelCtor = window.BroadcastChannel;
    if (typeof BroadcastChannelCtor === 'function') {
      try {
        channel = new BroadcastChannelCtor(AI_PATH_RUN_QUEUE_CHANNEL);
        channel.onmessage = (event: MessageEvent<unknown>): void => {
          handlePayload(event.data);
        };
      } catch (error) {
        logClientError(error);
        channel = null;
      }
    }

    return () => {
      disposedRef.current = true;
      stopBadgeRefresh();
      trackedRunsRef.current.forEach((trackedRun: TrackedProductRun) => trackedRun.unsubscribe());
      trackedRunsRef.current.clear();
      window.removeEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);
      channel?.close();
    };
  }, [queryClient]);

  return productAiRunStatusByProductId;
}

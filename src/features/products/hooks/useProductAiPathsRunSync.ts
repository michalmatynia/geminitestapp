'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { invalidateProductDetail } from '@/features/products/hooks/productCache';
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
import {
  listTriggerButtonRunFeedback,
  markPersistedRunTerminal,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';
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

const areFeedbackMapsEqual = (
  prev: ReadonlyMap<string, ProductAiRunFeedback>,
  next: ReadonlyMap<string, ProductAiRunFeedback>
): boolean => {
  if (prev.size !== next.size) return false;
  for (const [key, nextFeedback] of next) {
    const prevFeedback = prev.get(key);
    if (!prevFeedback) return false;
    // Only compare identity and status — updatedAt changes on every server
    // response even when nothing meaningful changed, causing needless re-renders.
    if (
      prevFeedback.runId !== nextFeedback.runId ||
      prevFeedback.status !== nextFeedback.status
    ) {
      return false;
    }
  }
  return true;
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
      setProductAiRunStatusByProductId((prev) => {
        const next = buildProductAiRunStatusByProductId(trackedRunsRef.current);
        if (next.size === 0 && prev.size === 0) return prev;
        if (areFeedbackMapsEqual(prev, next)) return prev;
        return next;
      });
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
      // Mark as terminal in persisted storage so it won't be re-tracked on next mount.
      const terminalStatus = trackedRun?.latestSnapshot?.status;
      if (terminalStatus && isTrackedAiPathRunTerminal(trackedRun.latestSnapshot!)) {
        markPersistedRunTerminal(runId, terminalStatus);
      }
      trackedRun?.unsubscribe();
      trackedRunsRef.current.delete(runId);
      void invalidateProductDetail(queryClient, productId);
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

    const trackRun = (
      runId: string,
      productId: string,
      initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined
    ): void => {
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
            status: initialSnapshot?.status ?? 'queued',
            updatedAt: initialSnapshot?.updatedAt,
            finishedAt: initialSnapshot?.finishedAt,
            errorMessage: initialSnapshot?.errorMessage ?? null,
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

    // Only rehydrate persisted runs that are recent enough to still be active.
    // Stale runs (>10 min) are likely from a previous session and would just
    // create unnecessary polling traffic.
    const MAX_PERSISTED_RUN_AGE_MS = 10 * 60 * 1_000;
    listTriggerButtonRunFeedback({
      entityType: 'product',
      activeOnly: true,
    }).forEach((persistedRun) => {
      if (!persistedRun.entityId) return;
      const runAge = persistedRun.updatedAt
        ? Date.now() - new Date(persistedRun.updatedAt).getTime()
        : Infinity;
      if (runAge > MAX_PERSISTED_RUN_AGE_MS) return;
      const initialStatus = persistedRun.status === 'waiting' ? 'queued' : persistedRun.status;
      trackRun(persistedRun.runId, persistedRun.entityId, {
        runId: persistedRun.runId,
        status: initialStatus,
        updatedAt: persistedRun.updatedAt,
        finishedAt: persistedRun.finishedAt,
        errorMessage: persistedRun.errorMessage,
        entityId: persistedRun.entityId,
        entityType: 'product',
      });
    });

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

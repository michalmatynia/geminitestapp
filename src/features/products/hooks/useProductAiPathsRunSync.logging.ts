import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import type { ProductAiRunFeedback } from '@/features/products/lib/product-ai-run-feedback';
import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';

import { AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS } from './useProductAiPathsRunSync.model';

export const logProductAiRunStatusMapChange = (args: {
  prev: ReadonlyMap<string, ProductAiRunFeedback>;
  next: ReadonlyMap<string, ProductAiRunFeedback>;
  trackedRunsCount: number;
}): void => {
  logProductListDebug(
    'product-ai-run-status-map-change',
    {
      previousCount: args.prev.size,
      nextCount: args.next.size,
      trackedRunsCount: args.trackedRunsCount,
      statuses: Array.from(args.next.entries()).map(([productId, feedback]) => ({
        productId,
        runId: feedback.runId,
        status: feedback.status,
      })),
    },
    {
      dedupeKey: 'product-ai-run-status-map-change',
      throttleMs: 500,
    }
  );
};

export const logProductAiRunFinalized = (args: {
  runId: string;
  productId: string;
  latestSnapshot: TrackedAiPathRunSnapshot | null;
  trackedRunsRemaining: number;
}): void => {
  logProductListDebug(
    'product-ai-run-finalized',
    {
      runId: args.runId,
      productId: args.productId,
      terminalStatus: args.latestSnapshot?.status ?? null,
      trackedRunsRemaining: args.trackedRunsRemaining,
    },
    {
      dedupeKey: 'product-ai-run-finalized',
      throttleMs: 250,
    }
  );
};

export const logProductAiRunBadgeRefreshTick = (trackedRunsCount: number): void => {
  logProductListDebug(
    'product-ai-run-badge-refresh-tick',
    { trackedRunsCount },
    {
      dedupeKey: 'product-ai-run-badge-refresh-tick',
      throttleMs: AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS,
    }
  );
};

export const logProductAiRunRetracked = (runId: string, productId: string): void => {
  logProductListDebug(
    'product-ai-run-retracked',
    { runId, productId },
    { dedupeKey: 'product-ai-run-retracked', throttleMs: 250 }
  );
};

export const logProductAiRunTracked = (args: {
  runId: string;
  productId: string;
  trackedRunsCount: number;
}): void => {
  logProductListDebug(
    'product-ai-run-tracked',
    {
      runId: args.runId,
      productId: args.productId,
      trackedRunsCount: args.trackedRunsCount,
    },
    { dedupeKey: 'product-ai-run-tracked', throttleMs: 250 }
  );
};

export const logProductAiRunSnapshot = (args: {
  runId: string;
  productId: string;
  snapshot: TrackedAiPathRunSnapshot;
}): void => {
  logProductListDebug(
    'product-ai-run-snapshot',
    {
      runId: args.runId,
      productId: args.productId,
      status: args.snapshot.status,
      trackingState: args.snapshot.trackingState,
    },
    {
      dedupeKey: `product-ai-run-snapshot:${args.runId}`,
      throttleMs: 250,
    }
  );
};

export const logProductAiRunPayload = (runId: string, productId: string): void => {
  logProductListDebug(
    'product-ai-run-payload',
    { runId, productId },
    { dedupeKey: 'product-ai-run-payload', throttleMs: 250 }
  );
};

export const logProductAiRunRehydrated = (args: {
  runId: string;
  productId: string;
  initialStatus: TrackedAiPathRunSnapshot['status'];
}): void => {
  logProductListDebug(
    'product-ai-run-rehydrated',
    {
      runId: args.runId,
      productId: args.productId,
      initialStatus: args.initialStatus,
    },
    { dedupeKey: 'product-ai-run-rehydrated', throttleMs: 250 }
  );
};

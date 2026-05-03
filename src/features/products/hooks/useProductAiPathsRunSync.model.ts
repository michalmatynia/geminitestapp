import type { ProductAiRunFeedback } from '@/features/products/lib/product-ai-run-feedback';
import {
  buildProductAiRunFeedbackFromSnapshot,
  compareProductAiRunFeedback,
} from '@/features/products/lib/product-ai-run-feedback';
import { parseAiPathRunEnqueuedEventPayload } from '@/shared/contracts/ai-paths';
import {
  type TrackedAiPathRunSnapshot,
  isTrackedAiPathRunTerminal,
} from '@/shared/lib/ai-paths/client-run-tracker';

export const AI_PATH_RUN_BADGE_TTL_MS = 30_000;
export const AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS = 10_000;
export const TERMINAL_PRODUCT_AI_RUN_BADGE_TTL_MS = 15_000;
export const MAX_PERSISTED_PRODUCT_AI_RUN_AGE_MS = 10 * 60 * 1_000;
export const EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID = new Map<string, ProductAiRunFeedback>();

export type TrackedProductRun = {
  productId: string;
  latestSnapshot: TrackedAiPathRunSnapshot | null;
  unsubscribe: () => void;
};

export type ProductAiRunStatusSetter = (
  updater: (
    prev: ReadonlyMap<string, ProductAiRunFeedback>
  ) => ReadonlyMap<string, ProductAiRunFeedback>
) => void;

export const resolveTrackedProductRun = (
  detail: unknown
): { runId: string; productId: string } | null => {
  const payload = parseAiPathRunEnqueuedEventPayload(detail);
  if (payload === null) return null;
  if (payload.entityType !== 'product') return null;
  if (payload.entityId === null || payload.runId === '') {
    return null;
  }
  return {
    runId: payload.runId,
    productId: payload.entityId,
  };
};

export const hasTrackedProductRuns = (
  trackedRuns: ReadonlyMap<string, TrackedProductRun>,
  productId: string
): boolean => {
  for (const trackedRun of trackedRuns.values()) {
    if (trackedRun.productId === productId) {
      return true;
    }
  }
  return false;
};

export const areFeedbackMapsEqual = (
  prev: ReadonlyMap<string, ProductAiRunFeedback>,
  next: ReadonlyMap<string, ProductAiRunFeedback>
): boolean => {
  if (prev.size !== next.size) return false;
  for (const [key, nextFeedback] of next) {
    const prevFeedback = prev.get(key);
    if (prevFeedback === undefined) return false;
    if (
      prevFeedback.runId !== nextFeedback.runId ||
      prevFeedback.status !== nextFeedback.status
    ) {
      return false;
    }
  }
  return true;
};

export const buildProductAiRunStatusByProductId = (
  trackedRuns: ReadonlyMap<string, TrackedProductRun>
): ReadonlyMap<string, ProductAiRunFeedback> => {
  const next = new Map<string, ProductAiRunFeedback>();

  trackedRuns.forEach((trackedRun: TrackedProductRun) => {
    const snapshot = trackedRun.latestSnapshot;
    if (
      snapshot === null ||
      snapshot.trackingState === 'stopped' ||
      isTrackedAiPathRunTerminal(snapshot)
    ) {
      return;
    }

    const feedback = buildProductAiRunFeedbackFromSnapshot(snapshot);
    if (feedback === null) return;

    const current = next.get(trackedRun.productId);
    if (current === undefined || compareProductAiRunFeedback(feedback, current) > 0) {
      next.set(trackedRun.productId, feedback);
    }
  });

  return next;
};

export const mergeProductAiRunFeedbackMaps = (args: {
  activeByProductId: ReadonlyMap<string, ProductAiRunFeedback>;
  terminalByProductId: ReadonlyMap<string, ProductAiRunFeedback>;
}): ReadonlyMap<string, ProductAiRunFeedback> => {
  const next = new Map<string, ProductAiRunFeedback>(args.terminalByProductId);
  args.activeByProductId.forEach((feedback: ProductAiRunFeedback, productId: string) => {
    const current = next.get(productId);
    if (current === undefined || compareProductAiRunFeedback(feedback, current) >= 0) {
      next.set(productId, feedback);
    }
  });
  return next;
};

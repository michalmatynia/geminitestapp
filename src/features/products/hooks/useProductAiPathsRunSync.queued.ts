import {
  buildQueuedProductAiRunSource,
  getQueuedProductSources,
  markQueuedProductSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';

import {
  AI_PATH_RUN_BADGE_TTL_MS,
  hasTrackedProductRuns,
  type TrackedProductRun,
} from './useProductAiPathsRunSync.model';

export const refreshQueuedProductAiRunBadge = (runId: string, productId: string): void => {
  const source = buildQueuedProductAiRunSource(runId);
  if (source === null) return;
  markQueuedProductSource(productId, source, AI_PATH_RUN_BADGE_TTL_MS);
};

export const syncQueuedSourcesForProduct = (
  trackedRuns: ReadonlyMap<string, TrackedProductRun>,
  productId: string
): void => {
  const activeQueuedSources = new Set<string>();
  trackedRuns.forEach((candidate: TrackedProductRun, trackedRunId: string) => {
    if (candidate.productId !== productId) return;
    const source = buildQueuedProductAiRunSource(trackedRunId);
    if (source !== null) {
      activeQueuedSources.add(source);
    }
  });

  getQueuedProductSources(productId).forEach((source: string) => {
    if (!source.startsWith('ai-run:')) return;
    if (activeQueuedSources.has(source)) return;
    removeQueuedProductSource(productId, source);
  });
};

export const removeQueuedProductAiRunSource = (runId: string, productId: string): void => {
  const source = buildQueuedProductAiRunSource(runId);
  if (source === null) return;
  removeQueuedProductSource(productId, source);
};

export const refreshRemainingQueuedProductAiRunBadges = (
  trackedRuns: ReadonlyMap<string, TrackedProductRun>,
  productId: string
): void => {
  if (!hasTrackedProductRuns(trackedRuns, productId)) return;
  trackedRuns.forEach((candidate: TrackedProductRun, trackedRunId: string) => {
    if (candidate.productId !== productId) return;
    refreshQueuedProductAiRunBadge(trackedRunId, productId);
  });
};

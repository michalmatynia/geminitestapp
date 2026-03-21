'use client';

import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import {
  resolveTriggerButtonRunFeedbackPresentation,
  type TriggerButtonRunFeedbackPresentation,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';

export type ProductAiRunFeedbackStatus =
  | 'queued'
  | 'running'
  | 'blocked_on_lease'
  | 'handoff_ready'
  | 'paused';

export type ProductAiRunFeedback = TriggerButtonRunFeedbackPresentation & {
  runId: string;
  status: ProductAiRunFeedbackStatus;
  updatedAt: string | null;
};

const ACTIVE_PRODUCT_AI_RUN_STATUSES = new Set<ProductAiRunFeedbackStatus>([
  'queued',
  'running',
  'blocked_on_lease',
  'handoff_ready',
  'paused',
]);

const PRODUCT_AI_RUN_STATUS_PRIORITY: Record<ProductAiRunFeedbackStatus, number> = {
  queued: 1,
  handoff_ready: 2,
  paused: 3,
  blocked_on_lease: 4,
  running: 5,
};

const resolveUpdatedAtMs = (value: ProductAiRunFeedback): number => {
  const timestamp = Date.parse(value.updatedAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const isProductAiRunFeedbackStatus = (
  value: TrackedAiPathRunSnapshot['status']
): value is ProductAiRunFeedbackStatus => ACTIVE_PRODUCT_AI_RUN_STATUSES.has(value as ProductAiRunFeedbackStatus);

export const resolveProductAiRunFeedback = (
  status: ProductAiRunFeedbackStatus
): TriggerButtonRunFeedbackPresentation => resolveTriggerButtonRunFeedbackPresentation(status);

export const resolveProductAiRunFeedbackForList = (args: {
  productId: string;
  queuedProductIds?: ReadonlySet<string> | undefined;
  productAiRunStatusByProductId?: ReadonlyMap<string, ProductAiRunFeedback> | undefined;
}): ProductAiRunFeedback | null => {
  const trackerFeedback = args.productAiRunStatusByProductId?.get(args.productId) ?? null;
  if (trackerFeedback) {
    return trackerFeedback;
  }
  if (!args.queuedProductIds?.has(args.productId)) {
    return null;
  }

  return {
    runId: '',
    status: 'queued',
    updatedAt: null,
    ...resolveProductAiRunFeedback('queued'),
  };
};

export const buildProductAiRunFeedbackFromSnapshot = (
  snapshot: TrackedAiPathRunSnapshot
): ProductAiRunFeedback | null => {
  if (snapshot.trackingState === 'stopped' || !isProductAiRunFeedbackStatus(snapshot.status)) {
    return null;
  }

  return {
    runId: snapshot.runId,
    status: snapshot.status,
    updatedAt: snapshot.updatedAt,
    ...resolveProductAiRunFeedback(snapshot.status),
  };
};

export const compareProductAiRunFeedback = (
  left: ProductAiRunFeedback,
  right: ProductAiRunFeedback
): number => {
  const priorityDifference =
    PRODUCT_AI_RUN_STATUS_PRIORITY[left.status] - PRODUCT_AI_RUN_STATUS_PRIORITY[right.status];
  if (priorityDifference !== 0) {
    return priorityDifference;
  }
  return resolveUpdatedAtMs(left) - resolveUpdatedAtMs(right);
};

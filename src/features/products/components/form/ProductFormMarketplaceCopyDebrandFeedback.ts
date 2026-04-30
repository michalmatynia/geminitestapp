'use client';

import { useEffect } from 'react';

import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import {
  clearTriggerButtonRunFeedback,
  isTriggerButtonRunFeedbackTerminal,
  persistTriggerButtonRunFeedback,
  readTriggerButtonRunFeedback,
  type TriggerButtonRunFeedbackSnapshot,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { notifyAiPathRunEnqueued } from '@/shared/lib/query-invalidation';

export type DebrandRunStatus = TrackedAiPathRunSnapshot['status'] | 'waiting';

export const DEBRAND_STATUS_LABELS: Record<DebrandRunStatus, string> = {
  waiting: 'Queueing',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
};

const MARKETPLACE_COPY_DEBRAND_FEEDBACK_LOCATION = 'product_marketplace_copy_row';
const MARKETPLACE_COPY_DEBRAND_FEEDBACK_BUTTON_PREFIX = 'product-marketplace-copy-debrand-row';

const buildIntegrationKey = (integrationIds: readonly string[]): string =>
  integrationIds
    .map((integrationId: string): string => integrationId.trim())
    .filter((integrationId: string): boolean => integrationId.length > 0)
    .sort((left: string, right: string): number => left.localeCompare(right))
    .join(',');

export const buildMarketplaceCopyDebrandFeedbackButtonId = (input: {
  productId: string | null;
  integrationIds: readonly string[];
}): string | null => {
  const productId = input.productId?.trim() ?? '';
  const integrationKey = buildIntegrationKey(input.integrationIds);
  if (productId.length === 0 || integrationKey.length === 0) return null;
  return `${MARKETPLACE_COPY_DEBRAND_FEEDBACK_BUTTON_PREFIX}:${productId}:${integrationKey}`;
};

export const readMarketplaceCopyDebrandRunFeedback = (input: {
  productId: string | null;
  integrationIds: readonly string[];
}): TriggerButtonRunFeedbackSnapshot | null => {
  const buttonId = buildMarketplaceCopyDebrandFeedbackButtonId(input);
  if (buttonId === null) return null;
  return readTriggerButtonRunFeedback({ buttonId, entityType: 'product', entityId: input.productId });
};

export const persistMarketplaceCopyDebrandRunFeedback = (input: {
  productId: string | null;
  integrationIds: readonly string[];
  run: TriggerButtonRunFeedbackSnapshot;
}): void => {
  const buttonId = buildMarketplaceCopyDebrandFeedbackButtonId(input);
  if (buttonId === null) return;
  persistTriggerButtonRunFeedback({
    buttonId,
    location: MARKETPLACE_COPY_DEBRAND_FEEDBACK_LOCATION,
    entityType: 'product',
    entityId: input.productId,
    run: input.run,
  });
};

export const clearMarketplaceCopyDebrandRunFeedback = (input: {
  productId: string | null;
  integrationIds: readonly string[];
}): void => {
  const buttonId = buildMarketplaceCopyDebrandFeedbackButtonId(input);
  if (buttonId === null) return;
  clearTriggerButtonRunFeedback({
    buttonId,
    location: MARKETPLACE_COPY_DEBRAND_FEEDBACK_LOCATION,
    entityType: 'product',
    entityId: input.productId,
  });
};

export const isMarketplaceCopyDebrandRunFeedbackTerminal = (
  feedback: TriggerButtonRunFeedbackSnapshot
): boolean => isTriggerButtonRunFeedbackTerminal(feedback.status);

export const useRestoredMarketplaceCopyDebrandRun = (input: {
  productId: string | null;
  integrationIds: string[];
  pendingRunId: string | null;
  setPendingRunId: (runId: string) => void;
  setRunStatus: (status: DebrandRunStatus) => void;
}): void => {
  const { productId, integrationIds, pendingRunId, setPendingRunId, setRunStatus } = input;

  useEffect(() => {
    if (pendingRunId !== null) return;
    const restoredFeedback = readMarketplaceCopyDebrandRunFeedback({
      productId,
      integrationIds,
    });
    if (restoredFeedback === null) return;
    if (restoredFeedback.status === 'completed') {
      clearMarketplaceCopyDebrandRunFeedback({ productId, integrationIds });
      return;
    }
    setRunStatus(restoredFeedback.status);
    if (!isMarketplaceCopyDebrandRunFeedbackTerminal(restoredFeedback)) {
      setPendingRunId(restoredFeedback.runId);
    }
  }, [integrationIds, pendingRunId, productId, setPendingRunId, setRunStatus]);
};

export const notifyMarketplaceCopyDebrandRunQueued = (input: {
  runId: string;
  productId: string | null;
}): void => {
  if (input.productId === null) return;
  notifyAiPathRunEnqueued(input.runId, { entityId: input.productId, entityType: 'product' });
};

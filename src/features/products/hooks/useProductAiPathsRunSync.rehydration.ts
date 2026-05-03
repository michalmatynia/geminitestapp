import type { TrackedAiPathRunSnapshot } from '@/shared/lib/ai-paths/client-run-tracker';
import {
  listTriggerButtonRunFeedback,
  type TriggerButtonRunFeedbackRecord,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';

import { MAX_PERSISTED_PRODUCT_AI_RUN_AGE_MS } from './useProductAiPathsRunSync.model';

export type PersistedProductAiPathRun = {
  runId: string;
  productId: string;
  initialStatus: TrackedAiPathRunSnapshot['status'];
  initialSnapshot: Partial<TrackedAiPathRunSnapshot>;
};

const isRecentPersistedProductAiRun = (
  persistedRun: TriggerButtonRunFeedbackRecord
): boolean => {
  if (persistedRun.updatedAt === null) return false;
  const runAge = Date.now() - new Date(persistedRun.updatedAt).getTime();
  return runAge <= MAX_PERSISTED_PRODUCT_AI_RUN_AGE_MS;
};

const resolvePersistedRunInitialStatus = (
  status: TriggerButtonRunFeedbackRecord['status']
): TrackedAiPathRunSnapshot['status'] => {
  if (status === 'waiting') return 'queued';
  return status;
};

const toPersistedProductAiPathRun = (
  persistedRun: TriggerButtonRunFeedbackRecord
): PersistedProductAiPathRun | null => {
  const productId = persistedRun.entityId;
  if (productId === null) return null;
  if (!isRecentPersistedProductAiRun(persistedRun)) return null;

  const initialStatus = resolvePersistedRunInitialStatus(persistedRun.status);
  return {
    runId: persistedRun.runId,
    productId,
    initialStatus,
    initialSnapshot: {
      runId: persistedRun.runId,
      status: initialStatus,
      updatedAt: persistedRun.updatedAt,
      finishedAt: persistedRun.finishedAt,
      errorMessage: persistedRun.errorMessage,
      entityId: productId,
      entityType: 'product',
    },
  };
};

export const listRecentPersistedProductAiPathRuns = (): PersistedProductAiPathRun[] => {
  const persistedRuns: PersistedProductAiPathRun[] = [];
  listTriggerButtonRunFeedback({
    entityType: 'product',
    activeOnly: true,
  }).forEach((persistedRun: TriggerButtonRunFeedbackRecord) => {
    const productRun = toPersistedProductAiPathRun(persistedRun);
    if (productRun !== null) {
      persistedRuns.push(productRun);
    }
  });
  return persistedRuns;
};

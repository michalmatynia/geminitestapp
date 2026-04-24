import { removePathRunQueueEntries } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const cleanupRunQueueEntries = (runId: string): void => {
  const promise = removePathRunQueueEntries([runId]) as Promise<void>;
  promise.catch((error: unknown) => {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(`Non-critical queue cleanup failure for run ${runId}`, {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntries',
      runId,
      error,
    });
  });
};

export const cleanupRunQueueEntriesBatch = (runIds: string[]): void => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) return;
  const promise = removePathRunQueueEntries(uniqueRunIds) as Promise<void>;
  promise.catch((error: unknown) => {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Non-critical queue cleanup failure for bulk run deletion', {
      service: 'ai-paths-service',
      action: 'cleanupRunQueueEntriesBatch',
      runCount: uniqueRunIds.length,
      error,
    });
  });
};

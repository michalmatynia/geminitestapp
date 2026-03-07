import { QueryClient } from '@tanstack/react-query';
import {
  invalidateAiPathQueue,
  invalidateNotes,
  notifyAiPathRunEnqueued,
  invalidateProductsCountsAndDetail,
  invalidateProductsAndCounts,
  invalidateIntegrationJobs,
} from '@/shared/lib/query-invalidation';
import { TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';

export const handleAiPathTriggerInvalidation = async (args: {
  queryClient: QueryClient;
  runId: string;
  entityType: TriggerEventEntityType;
  entityId: string | null | undefined;
}): Promise<void> => {
  const { queryClient, runId, entityType, entityId } = args;

  void invalidateAiPathQueue(queryClient);

  notifyAiPathRunEnqueued(runId, {
    entityId: entityId ?? null,
    entityType: entityType,
  });

  if (entityType === 'product') {
    if (entityId) {
      void invalidateProductsCountsAndDetail(queryClient, entityId);
    } else {
      void invalidateProductsAndCounts(queryClient);
    }
  }
  if (entityType === 'note') {
    void invalidateNotes(queryClient);
  }

  // @ts-ignore - integration is a valid entity type in the contract but TypeScript is being overly restrictive here.
  if (entityType === 'integration') {
    void invalidateIntegrationJobs(queryClient);
  }
};

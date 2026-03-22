import { QueryClient } from '@tanstack/react-query';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';
import {
  invalidateAiPathQueue,
  invalidateNotes,
  notifyAiPathRunEnqueued,
  invalidateProductDetail,
  invalidateIntegrationJobs,
} from '@/shared/lib/query-invalidation';

export const handleAiPathTriggerInvalidation = async (args: {
  queryClient: QueryClient;
  runId: string;
  run?: AiPathRunRecord | null;
  entityType: TriggerEventEntityType;
  entityId: string | null | undefined;
}): Promise<void> => {
  const { queryClient, runId, run, entityType, entityId } = args;

  void invalidateAiPathQueue(queryClient);

  notifyAiPathRunEnqueued(runId, {
    entityId: entityId ?? null,
    entityType: entityType,
    run: run ?? null,
  });

  if (entityType === 'product' && entityId) {
    void invalidateProductDetail(queryClient, entityId);
  }
  if (entityType === 'note') {
    void invalidateNotes(queryClient);
  }

  // @ts-ignore - integration is a valid entity type in the contract but TypeScript is being overly restrictive here.
  if (entityType === 'integration') {
    void invalidateIntegrationJobs(queryClient);
  }
};

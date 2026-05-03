import { type QueryClient } from '@tanstack/react-query';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { type TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';
import {
  invalidateAiPathQueue,
  invalidateNotes,
  notifyAiPathRunEnqueued,
  invalidateProductDetail,
  invalidateIntegrationJobs,
} from '@/shared/lib/query-invalidation';

const buildAiPathTriggerNotificationPayload = (args: {
  entityId: string | null | undefined;
  entityType: TriggerEventEntityType;
  run?: AiPathRunRecord | null;
}) => ({
  entityId: args.entityId ?? null,
  entityType: args.entityType,
  run: args.run ?? null,
});

const invalidateAiPathTriggerEntity = (
  queryClient: QueryClient,
  entityType: TriggerEventEntityType,
  entityId: string | null | undefined
): void => {
  if (entityType === 'product' && entityId) {
    void invalidateProductDetail(queryClient, entityId);
    return;
  }
  if (entityType === 'note') {
    void invalidateNotes(queryClient);
    return;
  }

  // @ts-ignore - integration is a valid entity type in the contract but TypeScript is being overly restrictive here.
  if (entityType === 'integration') {
    void invalidateIntegrationJobs(queryClient);
  }
};

export const handleAiPathTriggerInvalidation = async (args: {
  queryClient: QueryClient;
  runId: string;
  run?: AiPathRunRecord | null;
  entityType: TriggerEventEntityType;
  entityId: string | null | undefined;
}): Promise<void> => {
  const { queryClient, runId, run, entityType, entityId } = args;

  void invalidateAiPathQueue(queryClient);

  notifyAiPathRunEnqueued(
    runId,
    buildAiPathTriggerNotificationPayload({ entityId, entityType, run })
  );
  invalidateAiPathTriggerEntity(queryClient, entityType, entityId);
};

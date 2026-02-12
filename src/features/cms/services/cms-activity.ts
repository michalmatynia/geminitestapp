import 'server-only';

import { ErrorSystem } from '@/features/observability/server';

interface CmsActivityLogInput {
  event: string;
  description: string;
  userId: string | null;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export async function logCmsActivity(input: CmsActivityLogInput): Promise<void> {
  await ErrorSystem.logInfo(input.description, {
    service: 'cms',
    event: input.event,
    userId: input.userId,
    entityId: input.entityId,
    entityType: input.entityType,
    context: input.metadata,
  });
}

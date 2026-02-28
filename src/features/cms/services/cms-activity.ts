import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

interface CmsActivityLogInput {
  event: string;
  description: string;
  userId: string | null;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export async function logCmsActivity(input: CmsActivityLogInput): Promise<void> {
  await (ErrorSystem as any).logInfo(input.description, {
    service: 'cms',
    event: input.event,
    userId: input.userId,
    entityId: input.entityId,
    entityType: input.entityType,
    context: input.metadata,
  });
}

/**
 * CMS Activity Service
 * 
 * Manages the structured logging of CMS activities for auditing and observability.
 */

import 'server-only';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

export interface CmsActivityLogInput {
  event: string;
  description: string;
  userId: string | null;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs a structured CMS activity event.
 */
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

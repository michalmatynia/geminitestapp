/**
 * CMS Activity Service
 * 
 * Manages the structured logging of CMS activities for auditing and observability.
 */

import 'server-only';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { logActivity } from '@/shared/utils/observability/activity-service';

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
  await logActivity({
    applicationId: 'cms-builder',
    applicationName: 'CMS Builder',
    sourceService: 'cms',
    type: `cms.${input.event.toLowerCase()}`,
    description: input.description,
    userId: input.userId,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? 'cms',
    metadata: input.metadata ?? null,
  });

  await ErrorSystem.logInfo(input.description, {
    applicationId: 'cms-builder',
    service: 'cms',
    event: input.event,
    userId: input.userId,
    entityId: input.entityId,
    entityType: input.entityType,
    context: input.metadata,
  });
}

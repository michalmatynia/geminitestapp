import 'server-only';

import type { CreateActivityLogDto, ActivityLogDto, ActivityFilters } from '@/shared/contracts/system';

import { getActivityRepository } from '../../lib/observability/activity-repository';
import { logSystemEvent } from '../../lib/observability/system-logger';

/**
 * Logs a user activity event.
 *
 * @example
 * ```ts
 * await logActivity({
 *   type: ActivityTypes.PRODUCT.CREATED,
 *   description: `User created product ${sku}`,
 *   userId: user.id,
 *   entityId: product.id,
 *   entityType: 'product'
 * });
 * ```
 */
export async function logActivity(data: CreateActivityLogDto): Promise<ActivityLogDto> {
  const repository = await getActivityRepository();
  const activity = await repository.createActivity(data);

  // Connect to centralized logging.
  // We use void/catch to avoid blocking activity writes if logging fails.
  void logSystemEvent({
    level: 'info',
    message: `Activity: ${data.type} - ${data.description}`,
    source: data.entityType || 'activity-service',
    userId: data.userId ?? null,
    context: {
      activityId: activity.id,
      activityType: data.type,
      userId: activity.userId,
      entityId: activity.entityId,
      entityType: activity.entityType,
      metadata: activity.metadata || data.metadata || null,
    },
  }).catch(() => {
    // Silent fail for the secondary log.
  });

  return activity;
}

/**
 * List activity logs with optional filtering.
 */
export async function listActivity(filters: ActivityFilters = {}): Promise<ActivityLogDto[]> {
  const repository = await getActivityRepository();
  return repository.listActivity(filters);
}


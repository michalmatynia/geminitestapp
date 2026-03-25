import 'server-only';

import { randomUUID } from 'crypto';

import type { CreateActivityLog, ActivityLog, ActivityFilters } from '@/shared/contracts/system';

import { getActivityRepository } from '../../lib/observability/activity-repository';
import { isServerLoggingEnabled } from '../../lib/observability/logging-controls-server';
import { logSystemEvent } from '../../lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const createSuppressedActivityLog = (data: CreateActivityLog): ActivityLog => {
  const nowIso = new Date().toISOString();
  return {
    id: `activity-disabled-${randomUUID()}`,
    type: data.type,
    description: data.description,
    userId: data.userId ?? null,
    entityId: data.entityId ?? null,
    entityType: data.entityType ?? null,
    metadata: data.metadata ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};


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
export async function logActivity(data: CreateActivityLog): Promise<ActivityLog> {
  if (!(await isServerLoggingEnabled('activity'))) {
    return createSuppressedActivityLog(data);
  }

  const repository = await getActivityRepository();
  let activity: ActivityLog;
  try {
    activity = await repository.createActivity(data);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const nowIso = new Date().toISOString();
    activity = {
      id: `activity-fallback-${randomUUID()}`,
      type: data.type,
      description: data.description,
      userId: data.userId ?? null,
      entityId: data.entityId ?? null,
      entityType: data.entityType ?? null,
      metadata: data.metadata ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

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
export async function listActivity(filters: ActivityFilters = {}): Promise<ActivityLog[]> {
  const repository = await getActivityRepository();
  return repository.listActivity(filters);
}

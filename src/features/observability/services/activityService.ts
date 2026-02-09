import 'server-only';

import type { CreateActivityLogDto, ActivityLogDto } from '@/shared/dtos/system';

import { getActivityRepository } from './activity-repository';
import { logSystemEvent } from '../lib/system-logger';


/**
 * Logs a user activity event.
 * 
 * @example
 * ```ts
 * await logActivity({
 *   type: 'product.created',
 *   description: `User created product ${sku}`,
 *   userId: user.id,
 *   entityId: product.id,
 *   entityType: 'product'
 * });
 * ```
 */
export async function logActivity(data: CreateActivityLogDto): Promise<ActivityLogDto> {
  const repository = await getActivityRepository();
  const log = await repository.createActivity(data);

  // Connect to centralised logging
  // We use void/catch to ensure activity logging doesn't block if system logging fails,
  // although both usually go to the same DB.
  void logSystemEvent({
    level: 'info',
    message: `Activity: ${data.type} - ${data.description}`,
    source: 'activity-service',
    userId: data.userId ?? null,
    context: {
      activityId: log.id,
      activityType: data.type,
      entityId: data.entityId ?? null,
      entityType: data.entityType ?? null,
      metadata: data.metadata ?? null,
    },
  }).catch(() => {
    // Silent fail for the secondary log
  });

  return log;
}

/**
 * Common activity types for consistency.
 */
export const ActivityTypes = {
  PRODUCT: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    DELETED: 'product.deleted',
    DUPLICATED: 'product.duplicated',
    SYNCED: 'product.synced',
  },
  AUTH: {
    REGISTERED: 'auth.registered',
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    PASSWORD_CHANGED: 'auth.password_changed',
  },
  CMS: {
    PAGE_CREATED: 'cms.page_created',
    PAGE_UPDATED: 'cms.page_updated',
    PAGE_DELETED: 'cms.page_deleted',
    THEME_UPDATED: 'cms.theme_updated',
  },
  SYSTEM: {
    SETTINGS_CHANGED: 'system.settings_changed',
    DATABASE_SYNC: 'system.database_sync',
  }
} as const;

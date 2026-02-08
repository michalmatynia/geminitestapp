import 'server-only';

import { getActivityRepository } from '@/features/observability/server';
import type { CreateActivityLogDto, ActivityLogDto } from '@/shared/dtos/system';

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
  return repository.createActivity(data);
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

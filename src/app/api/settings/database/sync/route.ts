/**
 * Settings Database Sync API Route
 * 
 * API endpoint for synchronizing settings with database.
 * Provides:
 * - POST endpoint for database sync operations
 * - Settings persistence and synchronization
 * - Database state management
 * - Observability integration for sync operations
 * - Error handling and recovery
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/shared/server/api/settings/database/sync/handler';

/** POST handler for database sync operations */
export const POST = apiHandler(postHandler, {
  source: 'settings.database.sync.POST',
});

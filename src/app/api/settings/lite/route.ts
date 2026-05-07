
/**
 * Settings Lite API Route
 * 
 * Lightweight API endpoint for retrieving essential settings without authentication.
 * Provides:
 * - GET endpoint for public settings access
 * - Query parameter validation with schema
 * - Environment-based rate limiting configuration
 * - Unauthenticated access for bootstrap settings
 * - Optimized for minimal payload and fast response times
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from '@/shared/server/api/settings/lite/handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(getHandler, {
  source: 'settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});


/**
 * Settings API Route
 * 
 * Main API endpoint for application settings management.
 * Provides:
 * - GET endpoint for settings retrieval with query parameters
 * - POST endpoint for settings updates and creation
 * - Authentication-protected settings access
 * - Configurable rate limiting for API protection
 * - Query schema validation for parameters
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  disableSettingsRateLimit,
  getHandler,
  postHandler,
  querySchema,
} from '@/shared/server/api/settings/handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: true,
  resolveSessionUser: false,
});

export const POST = apiHandler(postHandler, {
  source: 'settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: true,
  resolveSessionUser: false,
});

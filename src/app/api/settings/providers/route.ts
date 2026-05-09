
/**
 * Settings Providers API Route
 * 
 * API endpoint for retrieving provider configuration settings.
 * Provides:
 * - GET endpoint for provider settings access
 * - Authentication-protected provider data
 * - Database provider configuration
 * - Service provider status information
 * - Integration with settings management system
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from '@/shared/server/api/settings/providers/handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.providers.GET',
  requireAuth: true,
});

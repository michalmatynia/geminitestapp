/**
 * Settings Cache API Route
 * 
 * API endpoint for retrieving cached settings data.
 * Provides:
 * - GET endpoint for settings cache access
 * - Authentication-protected settings retrieval
 * - Optimized cache layer for performance
 * - User-scoped settings access control
 * - Integration with settings management system
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.cache.GET',
  requireAuth: true,
});

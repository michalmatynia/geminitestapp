/**
 * Google OAuth Settings API Route
 * 
 * API endpoint for managing Google OAuth credentials and configuration.
 * Provides:
 * - GET endpoint for OAuth status retrieval
 * - POST endpoint for OAuth credential updates
 * - Authentication-protected OAuth management
 * - No-cache policy for security sensitive data
 * - Integration with Google OAuth services
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.google-oauth.GET',
  requireAuth: true,
  cacheControl: 'no-store',
});

export const POST = apiHandler(postHandler, {
  source: 'settings.google-oauth.POST',
  requireAuth: true,
  cacheControl: 'no-store',
});

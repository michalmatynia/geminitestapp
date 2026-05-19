/**
 * Google OAuth Settings API Handler
 * 
 * API handlers for Google OAuth credential management.
 * Provides:
 * - GET handler for OAuth status retrieval
 * - POST handler for OAuth credential updates
 * - Settings management access control
 * - JSON body validation with Zod schemas
 * - Integration with Google OAuth services
 */

import { NextResponse, type NextRequest } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  readGoogleOAuthCredentialsStatus,
  updateGoogleOAuthCredentials,
} from '@/shared/lib/oauth/google-oauth-credentials';
import { updateGoogleOAuthCredentialsSchema } from '@/shared/contracts/google-oauth-credentials';

/**
 * Google OAuth Settings API Handlers
 *
 * HTTP request handlers for Google OAuth configuration.
 * Handlers: getHandler, postHandler
 *
 * - Manages Google OAuth credentials and settings
 * - Handles OAuth flow configuration
 * - Controls third-party integrations
 */

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  return NextResponse.json(await readGoogleOAuthCredentialsStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const parsed = await parseJsonBody(req, updateGoogleOAuthCredentialsSchema, {
    logPrefix: 'settings.googleOAuth.POST',
  });
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(await updateGoogleOAuthCredentials(parsed.data), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

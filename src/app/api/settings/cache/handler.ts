/**
 * Settings Cache API Handler
 * 
 * API handler for settings cache management and debugging.
 * Provides:
 * - GET endpoint for cache statistics
 * - Settings management access control
 * - Cache debug mode validation
 * - Cache stats retrieval
 * - Development and debugging support
 */

import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getSettingsCacheStats, isSettingsCacheDebugEnabled } from '@/shared/lib/settings-cache';

/**
 * Cache Settings API Handlers
 *
 * HTTP request handlers for cache configuration.
 * Handlers: postHandler
 *
 * - Clears application caches
 * - Manages cache invalidation strategies
 * - Handles cache warming and preloading
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
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  if (!isSettingsCacheDebugEnabled()) {
    throw notFoundError('Not found');
  }
  return NextResponse.json(getSettingsCacheStats(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

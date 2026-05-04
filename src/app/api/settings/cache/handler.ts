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

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  if (!isSettingsCacheDebugEnabled()) {
    throw notFoundError('Not found');
  }
  return NextResponse.json(getSettingsCacheStats(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

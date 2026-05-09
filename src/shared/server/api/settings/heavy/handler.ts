/**
 * Settings Heavy Handler
 * 
 * API handler for retrieving heavy/large settings data.
 * Provides:
 * - GET endpoint for heavy settings access
 * - Settings management access control
 * - Rate limiting configuration for production
 * - Heavy settings scope handling
 * - Administrative settings access
 */

import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';

import { getHandler } from '@/shared/server/api/settings/handler';

/** Disable rate limiting in non-production environments */
export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const getHeavyHandler = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  await assertSettingsManageAccess();
  return getHandler(req, ctx, 'heavy');
};

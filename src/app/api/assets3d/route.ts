
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

/**
 * GET /api/assets3d
 * 
 * Retrieves a list of 3D assets.
 * Requires authentication.
 */
export const GET = apiHandler(getHandler, {
  source: 'assets3d.GET',
  querySchema,
  requireAuth: true,
});

/**
 * POST /api/assets3d
 * 
 * Creates a new 3D asset record.
 * Requires authentication.
 */
export const POST = apiHandler(postHandler, {
  source: 'assets3d.POST',
  requireAuth: true,
});

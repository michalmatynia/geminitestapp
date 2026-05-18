
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

/**
 * GET /api/cms/slugs
 * 
 * Retrieves CMS slugs.
 * Requires authentication.
 */
export const GET = apiHandler(getHandler, {
  source: 'cms.slugs.GET',
  querySchema,
  requireAuth: true,
});

/**
 * POST /api/cms/slugs
 * 
 * Creates or updates a CMS slug.
 * Requires authentication.
 */
export const POST = apiHandler(postHandler, {
  source: 'cms.slugs.POST',
  querySchema,
  requireAuth: true,
});

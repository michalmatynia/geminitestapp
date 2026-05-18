
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

/**
 * GET /api/cms/themes
 * 
 * Retrieves CMS themes.
 * Requires authentication.
 */
export const GET = apiHandler(getHandler, {
  source: 'cms.themes.GET',
  requireAuth: true,
});

/**
 * POST /api/cms/themes
 * 
 * Creates a new CMS theme.
 * Requires authentication.
 */
export const POST = apiHandler(postHandler, {
  source: 'cms.themes.POST',
  requireAuth: true,
});

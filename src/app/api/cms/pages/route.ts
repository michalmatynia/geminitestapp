
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

/**
 * GET /api/cms/pages
 * 
 * Retrieves CMS pages.
 * Requires authentication.
 */
export const GET = apiHandler(getHandler, {
  source: 'cms.pages.GET',
  requireAuth: true,
});

/**
 * POST /api/cms/pages
 * 
 * Creates a new CMS page.
 * Requires authentication.
 */
export const POST = apiHandler(postHandler, {
  source: 'cms.pages.POST',
  requireAuth: true,
});

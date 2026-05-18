
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

/**
 * POST /api/cms/media
 * 
 * Uploads media content for the CMS.
 * Requires authentication.
 */
export const POST = apiHandler(postHandler, {
  source: 'cms.media.POST',
  requireAuth: true,
});

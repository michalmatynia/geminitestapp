import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from '../handler';

export const GET = apiHandlerWithParams<{ path: string[] }>(getHandler, {
  source: 'cms.media.local.path.GET',
  requireAuth: true,
});

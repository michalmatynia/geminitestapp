
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'cms.pages.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'cms.pages.POST',
  requireAuth: true,
});


import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'cms.domains.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'cms.domains.POST',
  requireAuth: true,
});


import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'cms.slugs.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'cms.slugs.POST',
  querySchema,
  requireAuth: true,
});


import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'cms.slugs.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'cms.slugs.POST',
  querySchema,
  requireAuth: true,
});


import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'assets3d.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'assets3d.POST',
  requireAuth: true,
});

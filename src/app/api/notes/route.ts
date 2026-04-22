
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'notes.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'notes.POST',
  requireAuth: true,
});

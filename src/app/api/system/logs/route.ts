
import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'system.logs.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'system.logs.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'system.logs.DELETE',
  requireAuth: true,
});

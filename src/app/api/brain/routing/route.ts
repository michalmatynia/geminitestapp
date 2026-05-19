import { apiHandler } from '@/shared/lib/api/api-handler';

import { bodySchema, getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'brain.routing.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'brain.routing.POST',
  parseJsonBody: true,
  bodySchema,
  requireAuth: true,
});

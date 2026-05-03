
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'analytics.events.POST',
  requireCsrf: false,
  rateLimitKey: 'write',
});

export const GET = apiHandler(getHandler, {
  source: 'analytics.events.GET',
  querySchema,
});

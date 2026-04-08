
import { apiHandler } from '@/shared/lib/api/api-handler';

import { activityQuerySchema, GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'system.activity.GET',
  querySchema: activityQuerySchema,
  requireAuth: true,
});

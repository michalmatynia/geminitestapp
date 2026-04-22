
import { apiHandler } from '@/shared/lib/api/api-handler';

import { activityQuerySchema, getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'system.activity.GET',
  querySchema: activityQuerySchema,
  requireAuth: true,
});

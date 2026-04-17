import { apiHandler } from '@/shared/lib/api/api-handler';

import { getResourcesHandler, querySchema } from './handler';

export const GET = apiHandler(getResourcesHandler, {
  source: 'agent.resources.GET',
  querySchema,
  requireAuth: true,
});

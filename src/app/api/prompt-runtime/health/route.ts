import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'prompt-runtime.health.GET',
  querySchema,
});

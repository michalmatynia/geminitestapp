export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.linkedin.callback.GET',
  querySchema,
  requireAuth: true,
});

export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(getHandler, {
  source: 'v2.integrations.[id].connections.[connectionId].linkedin.callback.GET',
  querySchema,
  requireAuth: true,
});

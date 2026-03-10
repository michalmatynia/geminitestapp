export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(GET_handler, {
  source: 'v2.integrations.[id].connections.[connectionId].allegro.callback.GET',
  querySchema,
  requireAuth: true,
});

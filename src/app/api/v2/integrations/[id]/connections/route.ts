export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.integrations.[id].connections.GET',
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.integrations.[id].connections.POST',
  requireCsrf: false,
});

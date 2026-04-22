export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'v2.integrations.[id].connections.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.integrations.[id].connections.POST',
  requireCsrf: false,
  requireAuth: true,
});

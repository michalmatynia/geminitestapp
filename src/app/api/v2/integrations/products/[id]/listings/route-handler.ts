export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.integrations.products.[id].listings.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.integrations.products.[id].listings.POST',
  requireAuth: true,
  requireCsrf: false,
});

export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'integrations.products.[id].listings.GET', requireCsrf: false
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'integrations.products.[id].listings.POST', requireCsrf: false
});

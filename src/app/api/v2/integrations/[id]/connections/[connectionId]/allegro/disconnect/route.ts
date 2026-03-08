export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(POST_handler, {
  source: 'v2.integrations.[id].connections.[connectionId].allegro.disconnect.POST',
  requireCsrf: false,
});

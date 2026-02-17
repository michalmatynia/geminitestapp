export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(GET_handler, {
  source: 'integrations.[id].connections.[connectionId].base.inventories.GET',
  requireCsrf: false,
});

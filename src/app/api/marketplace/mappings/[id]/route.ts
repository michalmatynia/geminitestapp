export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'marketplace.mappings.[id].GET',
  requireAuth: true,
});
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'marketplace.mappings.[id].PUT',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'marketplace.mappings.[id].DELETE',
  requireAuth: true,
});

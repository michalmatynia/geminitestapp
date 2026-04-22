
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, putHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'marketplace.mappings.[id].GET',
  requireAuth: true,
});
export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'marketplace.mappings.[id].PUT',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'marketplace.mappings.[id].DELETE',
  requireAuth: true,
});

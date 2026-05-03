
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'notes.[id].GET',
  requireAuth: true,
});
export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'notes.[id].PATCH',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'notes.[id].DELETE',
  requireAuth: true,
});

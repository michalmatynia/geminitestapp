
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'assets3d.[id].GET',
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'assets3d.[id].PATCH',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'assets3d.[id].DELETE',
  requireAuth: true,
});

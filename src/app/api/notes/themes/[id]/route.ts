
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'notes.themes.[id].GET',
  requireAuth: true,
});
export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'notes.themes.[id].PATCH',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'notes.themes.[id].DELETE',
  requireAuth: true,
});

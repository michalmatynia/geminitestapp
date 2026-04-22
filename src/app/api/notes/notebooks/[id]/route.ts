
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'notes.notebooks.[id].PATCH',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'notes.notebooks.[id].DELETE',
  requireAuth: true,
});


import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler, querySchema } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'notes.categories.[id].PATCH',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'notes.categories.[id].DELETE',
  querySchema,
  requireAuth: true,
});

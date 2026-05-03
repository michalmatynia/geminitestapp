
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'files.[id].DELETE',
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'files.[id].PATCH',
  requireAuth: true,
});

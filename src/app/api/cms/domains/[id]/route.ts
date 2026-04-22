
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, putHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'cms.domains.[id].DELETE',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'cms.domains.[id].PUT',
  requireAuth: true,
});


import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, putHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'cms.themes.[id].GET',
  requireAuth: true,
});
export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'cms.themes.[id].PUT',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'cms.themes.[id].DELETE',
  requireAuth: true,
});

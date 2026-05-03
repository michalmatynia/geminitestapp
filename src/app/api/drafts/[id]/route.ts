
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, putHandler, deleteHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'drafts.[id].GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'drafts.[id].PUT',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'drafts.[id].DELETE',
  requireAuth: true,
});

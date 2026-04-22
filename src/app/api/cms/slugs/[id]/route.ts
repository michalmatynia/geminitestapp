
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, putHandler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'cms.slugs.[id].GET',
  querySchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'cms.slugs.[id].DELETE',
  querySchema,
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'cms.slugs.[id].PUT',
  querySchema,
  requireAuth: true,
});

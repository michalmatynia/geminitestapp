export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, putHandler, deleteQuerySchema } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.integrations.connections.[id].PUT',
  requireCsrf: false,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.integrations.connections.[id].DELETE',
  requireCsrf: false,
  querySchema: deleteQuerySchema,
  requireAuth: true,
});

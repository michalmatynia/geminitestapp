export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PUT_handler, deleteQuerySchema } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.integrations.connections.[id].PUT',
  requireCsrf: false,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.integrations.connections.[id].DELETE',
  requireCsrf: false,
  querySchema: deleteQuerySchema,
});

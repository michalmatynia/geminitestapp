export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PUT_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'cms.domains.[id].DELETE',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'cms.domains.[id].PUT',
  requireAuth: true,
});

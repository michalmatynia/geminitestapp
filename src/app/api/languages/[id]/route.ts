export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PUT_handler } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'languages.[id].PUT',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'languages.[id].DELETE',
});

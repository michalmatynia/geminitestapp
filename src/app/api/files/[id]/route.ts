export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'files.[id].DELETE',
});

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'files.[id].PATCH',
});

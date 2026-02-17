export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'notes.categories.[id].PATCH',
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'notes.categories.[id].DELETE',
});

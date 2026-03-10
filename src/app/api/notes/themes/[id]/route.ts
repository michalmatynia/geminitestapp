export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PATCH_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'notes.themes.[id].GET',
  requireAuth: true,
});
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'notes.themes.[id].PATCH',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'notes.themes.[id].DELETE',
  requireAuth: true,
});

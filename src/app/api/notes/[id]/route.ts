export const runtime = 'nodejs';
export const revalidate = 10;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PATCH_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'notes.[id].GET',
});
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'notes.[id].PATCH',
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'notes.[id].DELETE',
});

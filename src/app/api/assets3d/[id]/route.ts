export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PATCH_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'assets3d.[id].GET',
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'assets3d.[id].PATCH',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'assets3d.[id].DELETE',
  requireAuth: true,
});

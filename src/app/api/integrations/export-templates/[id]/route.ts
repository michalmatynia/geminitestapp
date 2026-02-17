export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.export-templates.[id].GET',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.export-templates.[id].PUT',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.export-templates.[id].DELETE',
  requireCsrf: false,
  cacheControl: 'no-store',
});

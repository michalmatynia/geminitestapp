export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'cms.themes.[id].GET',
});
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'cms.themes.[id].PUT',
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'cms.themes.[id].DELETE',
});

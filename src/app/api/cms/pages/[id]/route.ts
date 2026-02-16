export const runtime = 'nodejs';
export const revalidate = 300;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'cms.pages.[id].GET',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'cms.pages.[id].PUT',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'cms.pages.[id].DELETE',
});

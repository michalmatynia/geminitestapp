export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, PUT_handler, DELETE_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'drafts.[id].GET',
  requireCsrf: false,
  cacheControl: 'no-store',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'drafts.[id].PUT',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'drafts.[id].DELETE',
});

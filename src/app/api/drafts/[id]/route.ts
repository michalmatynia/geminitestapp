export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 10;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'drafts.[id].GET' });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'drafts.[id].PUT' });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'drafts.[id].DELETE',
});

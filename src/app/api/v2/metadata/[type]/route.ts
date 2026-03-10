export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_intl_handler, POST_intl_handler } from '../handler';

export const GET = apiHandlerWithParams<{ type: string }>(GET_intl_handler, {
  source: 'v2.metadata.[type].GET',
  cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ type: string }>(POST_intl_handler, {
  source: 'v2.metadata.[type].POST',
  requireAuth: true,
});

export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'countries.GET',
  cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
});
export const POST = apiHandler(POST_handler, { source: 'countries.POST' });

export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_intl_handler, POST_intl_handler } from '../v2/metadata/handler';

export const GET = apiHandler(
  (req, ctx) => GET_intl_handler(req, ctx, { type: 'countries' }),
  {
    source: 'countries.GET',
    cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  }
);

export const POST = apiHandler(
  (req, ctx) => POST_intl_handler(req, ctx, { type: 'countries' }),
  { source: 'countries.POST' }
);

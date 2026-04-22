export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.product-listings.GET',
  cacheControl: 'no-store',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.product-listings.POST',
  requireCsrf: false,
  cacheControl: 'no-store',
  requireAuth: true,
});

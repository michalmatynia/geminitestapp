
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { paginationQuerySchema } from '@/shared/contracts/base';

import { getIntlHandler, postIntlHandler } from '../handler';

export const GET = apiHandlerWithParams<{ type: string }>(getIntlHandler, {
  source: 'v2.metadata.[type].GET',
  cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  requireAuth: true,
  querySchema: paginationQuerySchema,
});

export const POST = apiHandlerWithParams<{ type: string }>(postIntlHandler, {
  source: 'v2.metadata.[type].POST',
  requireAuth: true,
});

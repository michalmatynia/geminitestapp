
import { z } from 'zod';

import { paginationQuerySchema } from '@/shared/contracts/base';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getIntlHandler, postIntlHandler } from '../handler';

const metadataPaginationQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().positive().max(500).default(20),
});

export const GET = apiHandlerWithParams<{ type: string }>(getIntlHandler, {
  source: 'v2.metadata.[type].GET',
  cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  requireAuth: true,
  querySchema: metadataPaginationQuerySchema,
});

export const POST = apiHandlerWithParams<{ type: string }>(postIntlHandler, {
  source: 'v2.metadata.[type].POST',
  requireAuth: true,
});

export const runtime = 'nodejs';

import { getHandler, querySchema } from '@/app/api/v2/products/categories/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.categories.batch.GET',
  cacheControl: 'no-store',
  querySchema,
  rateLimitKey: 'search',
  requireAuth: true,
});

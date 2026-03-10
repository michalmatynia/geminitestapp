export const runtime = 'nodejs';

import { GET_handler, querySchema } from '@/app/api/v2/products/categories/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.categories.batch.GET',
  cacheControl: 'no-store',
  querySchema,
  rateLimitKey: 'search',
  requireAuth: true,
});

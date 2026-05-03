export const runtime = 'nodejs';

import { getHandler, querySchema } from '@/app/api/v2/products/categories/tree/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.categories.tree.GET',
  cacheControl: 'private, max-age=300, stale-while-revalidate=600',
  querySchema,
  requireAuth: true,
});

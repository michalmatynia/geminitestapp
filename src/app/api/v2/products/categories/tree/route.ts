export const runtime = 'nodejs';

import { GET_handler, querySchema } from '@/app/api/v2/products/categories/tree/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.categories.tree.GET',
  cacheControl: 'no-store',
  querySchema,
  requireAuth: true,
});

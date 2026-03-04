export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from '@/app/api/products/categories/tree/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.categories.tree.GET',
  cacheControl: 'no-store',
});

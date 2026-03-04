export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from '@/app/api/products/categories/batch/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.categories.batch.GET',
  cacheControl: 'no-store',
  rateLimitKey: 'search',
});

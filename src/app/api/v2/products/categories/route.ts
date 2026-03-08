export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  POST_handler,
  productCategoryCreateSchema,
  querySchema,
} from '@/app/api/v2/products/categories/handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.categories.GET',
  cacheControl: 'no-store',
  querySchema,
  rateLimitKey: 'search',
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.categories.POST',
  parseJsonBody: true,
  bodySchema: productCategoryCreateSchema,
});

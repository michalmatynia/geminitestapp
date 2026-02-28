export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

import { GET_handler, POST_handler, productCategoryCreateSchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.categories.GET',
  cacheControl: 'no-store',
  querySchema: catalogIdQuerySchema,
  rateLimitKey: 'search',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.categories.POST',
  parseJsonBody: true,
  bodySchema: productCategoryCreateSchema,
});

export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

import { GET_handler, POST_handler, productParameterCreateSchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.parameters.GET',
  querySchema: catalogIdQuerySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.parameters.POST',
  parseJsonBody: true,
  bodySchema: productParameterCreateSchema,
});

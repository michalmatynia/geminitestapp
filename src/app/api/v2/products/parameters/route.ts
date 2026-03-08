export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  POST_handler,
  productParameterCreateSchema,
  querySchema,
} from '@/app/api/v2/products/parameters/handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.parameters.GET',
  querySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.parameters.POST',
  parseJsonBody: true,
  bodySchema: productParameterCreateSchema,
});

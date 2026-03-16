export const runtime = 'nodejs';

import {
  GET_handler,
  POST_handler,
  productParameterCreateSchema,
  querySchema,
} from '@/app/api/v2/products/parameters/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.parameters.GET',
  querySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.parameters.POST',
  parseJsonBody: true,
  bodySchema: productParameterCreateSchema,
  requireAuth: true,
});

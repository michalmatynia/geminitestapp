export const runtime = 'nodejs';

import {
  getHandler,
  postHandler,
  productParameterCreateSchema,
  querySchema,
} from '@/app/api/v2/products/parameters/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.parameters.GET',
  querySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.parameters.POST',
  parseJsonBody: true,
  bodySchema: productParameterCreateSchema,
  requireAuth: true,
});

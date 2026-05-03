export const runtime = 'nodejs';

import {
  getHandler,
  postHandler,
  productCategoryCreateSchema,
  querySchema,
} from '@/app/api/v2/products/categories/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.categories.GET',
  cacheControl: 'no-store',
  querySchema,
  rateLimitKey: 'search',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.categories.POST',
  parseJsonBody: true,
  bodySchema: productCategoryCreateSchema,
  requireAuth: true,
});

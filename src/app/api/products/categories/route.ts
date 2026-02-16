export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  POST_handler,
  productCategoryCreateSchema,
} from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.categories.GET',
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.categories.POST',
  parseJsonBody: true,
  bodySchema: productCategoryCreateSchema,
});

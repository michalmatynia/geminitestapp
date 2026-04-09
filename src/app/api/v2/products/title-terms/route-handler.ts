export const runtime = 'nodejs';

import {
  GET_handler,
  POST_handler,
  querySchema,
} from '@/app/api/v2/products/title-terms/handler';
import { createProductTitleTermSchema } from '@/shared/contracts/products/title-terms';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.title-terms.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.title-terms.POST',
  parseJsonBody: true,
  bodySchema: createProductTitleTermSchema,
  requireAuth: true,
});

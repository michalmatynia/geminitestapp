export const runtime = 'nodejs';

import {
  GET_handler,
  POST_handler,
  productCustomFieldCreateSchema,
  querySchema,
} from '@/app/api/v2/products/custom-fields/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.custom-fields.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.custom-fields.POST',
  parseJsonBody: true,
  bodySchema: productCustomFieldCreateSchema,
  requireAuth: true,
});

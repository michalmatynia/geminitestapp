export const runtime = 'nodejs';

import {
  getHandler,
  postHandler,
  productCustomFieldCreateSchema,
  querySchema,
} from '@/app/api/v2/products/custom-fields/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.custom-fields.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.custom-fields.POST',
  parseJsonBody: true,
  bodySchema: productCustomFieldCreateSchema,
  requireAuth: true,
});

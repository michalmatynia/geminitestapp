export const runtime = 'nodejs';
export const revalidate = 300;

import {
  getHandler,
  postHandler,
  productTagCreateSchema,
  querySchema,
} from '@/app/api/v2/products/tags/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.tags.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.tags.POST',
  parseJsonBody: true,
  bodySchema: productTagCreateSchema,
  requireAuth: true,
});

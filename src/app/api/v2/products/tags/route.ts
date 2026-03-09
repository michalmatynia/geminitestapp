export const runtime = 'nodejs';
export const revalidate = 300;

import {
  GET_handler,
  POST_handler,
  productTagCreateSchema,
  querySchema,
} from '@/app/api/v2/products/tags/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.tags.GET',
  querySchema,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.tags.POST',
  parseJsonBody: true,
  bodySchema: productTagCreateSchema,
});

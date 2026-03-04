export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, productFilterSchema } from '@/app/api/v2/products/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.GET',
  querySchema: productFilterSchema,
  cacheControl: 'no-store',
});

export const POST = apiHandler(POST_handler, {
  source: 'products.POST',
  logSuccess: true,
});

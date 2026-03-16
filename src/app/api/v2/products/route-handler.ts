export const runtime = 'nodejs';
export const revalidate = 60;

import { GET_handler, POST_handler, querySchema } from '@/app/api/v2/products/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.POST',
  logSuccess: true,
  requireAuth: true,
});

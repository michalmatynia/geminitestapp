export const runtime = 'nodejs';
export const revalidate = 60;

import { getHandler, postHandler, querySchema } from '@/app/api/v2/products/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.POST',
  logSuccess: true,
  requireAuth: true,
});

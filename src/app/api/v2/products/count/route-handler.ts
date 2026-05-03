export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getHandler } from '@/app/api/v2/products/count/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { productFilterSchema } from '@/shared/lib/products/validations';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.count.GET',
  querySchema: productFilterSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

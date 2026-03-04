export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { productFilterSchema } from '@/shared/lib/products/validations';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from '@/app/api/products/paged/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.paged.GET',
  querySchema: productFilterSchema,
  cacheControl: 'no-store',
});

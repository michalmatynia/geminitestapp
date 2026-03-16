export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { GET_handler } from '@/app/api/v2/products/ids/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { productFilterSchema } from '@/shared/lib/products/validations';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.ids.GET',
  querySchema: productFilterSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const runtime = 'nodejs';

import { getHandler, querySchema } from '@/app/api/v2/products/validator-config/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.validator-config.GET',
  cacheControl: 'no-store',
  querySchema,
  requireAuth: true,
});

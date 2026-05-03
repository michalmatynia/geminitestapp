export const runtime = 'nodejs';

import { getHandler, querySchema } from '@/app/api/v2/products/scans/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.scans.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

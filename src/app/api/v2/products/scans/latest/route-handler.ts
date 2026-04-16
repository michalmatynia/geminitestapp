export const runtime = 'nodejs';

import { GET_handler, querySchema } from '@/app/api/v2/products/scans/latest/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.scans.latest.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

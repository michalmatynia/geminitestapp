export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getHandler, querySchema } from '@/app/api/v2/products/sync/runs/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.sync.runs.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

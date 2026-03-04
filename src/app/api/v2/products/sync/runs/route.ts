export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from '@/app/api/v2/products/sync/runs/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.sync.runs.GET',
  requireCsrf: false,
  querySchema,
  cacheControl: 'no-store',
});

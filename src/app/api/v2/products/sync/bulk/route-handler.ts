export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { postHandler, bulkSchema } from '@/app/api/v2/products/sync/bulk/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.sync.bulk.POST',
  parseJsonBody: true,
  bodySchema: bulkSchema,
  requireAuth: true,
});

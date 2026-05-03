export const runtime = 'nodejs';

import { postHandler } from '@/app/api/v2/products/archive/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.archive.batch.POST',
  requireAuth: true,
});

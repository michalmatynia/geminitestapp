export const runtime = 'nodejs';

import {
  postHandler,
  productMarketplaceCopyDebrandBatchRequestSchema,
} from '@/app/api/v2/products/marketplace-copy-debrand/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.marketplace-copy-debrand.batch.POST',
  parseJsonBody: true,
  bodySchema: productMarketplaceCopyDebrandBatchRequestSchema,
  requireAuth: true,
});

export const runtime = 'nodejs';

import {
  postHandler,
  productScanBatchRequestSchema,
} from '@/app/api/v2/products/scans/amazon/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scans.amazon.batch.POST',
  parseJsonBody: true,
  bodySchema: productScanBatchRequestSchema,
  requireAuth: true,
});

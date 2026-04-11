export const runtime = 'nodejs';

import {
  POST_handler,
  productAmazonBatchScanRequestSchema,
} from '@/app/api/v2/products/scans/amazon/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.scans.amazon.batch.POST',
  parseJsonBody: true,
  bodySchema: productAmazonBatchScanRequestSchema,
  requireAuth: true,
});

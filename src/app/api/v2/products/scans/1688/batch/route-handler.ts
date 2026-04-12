export const runtime = 'nodejs';

import {
  POST_handler,
  productScanBatchRequestSchema,
} from '@/app/api/v2/products/scans/1688/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.scans.1688.batch.POST',
  parseJsonBody: true,
  bodySchema: productScanBatchRequestSchema,
  requireAuth: true,
});

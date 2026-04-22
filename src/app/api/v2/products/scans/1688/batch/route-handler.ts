export const runtime = 'nodejs';

import {
  postHandler,
  product1688BatchScanRequestSchema,
} from '@/app/api/v2/products/scans/1688/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scans.1688.batch.POST',
  parseJsonBody: true,
  bodySchema: product1688BatchScanRequestSchema,
  requireAuth: true,
});

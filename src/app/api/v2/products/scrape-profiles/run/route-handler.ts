export const runtime = 'nodejs';

import {
  postHandler,
  productScrapeProfileRunRequestSchema,
} from '@/app/api/v2/products/scrape-profiles/run/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scrape-profiles.run.POST',
  parseJsonBody: true,
  bodySchema: productScrapeProfileRunRequestSchema,
  requireAuth: true,
  slowSuccessThresholdMs: 30_000,
});

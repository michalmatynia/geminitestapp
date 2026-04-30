export const runtime = 'nodejs';

import {
  postHandler,
  productScrapedSourceActionRequestSchema,
} from '@/app/api/v2/products/scraped-source/link/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scraped-source.link.POST',
  parseJsonBody: true,
  bodySchema: productScrapedSourceActionRequestSchema,
  requireAuth: true,
});

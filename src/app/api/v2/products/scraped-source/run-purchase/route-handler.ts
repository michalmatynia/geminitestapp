import {
  postHandler,
  productScrapedSourceActionRequestSchema,
} from '@/app/api/v2/products/scraped-source/run-purchase/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.scraped-source.run-purchase.POST',
  parseJsonBody: true,
  bodySchema: productScrapedSourceActionRequestSchema,
  requireAuth: true,
});

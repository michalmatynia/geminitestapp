export const runtime = 'nodejs';

import {
  getHandler,
  postHandler,
  querySchema,
} from '@/app/api/v2/products/title-terms/handler';
import { createProductTitleTermSchema } from '@/shared/contracts/products/title-terms';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.title-terms.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.title-terms.POST',
  parseJsonBody: true,
  bodySchema: createProductTitleTermSchema,
  requireAuth: true,
});

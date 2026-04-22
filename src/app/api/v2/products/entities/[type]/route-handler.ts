export const runtime = 'nodejs';

import {
  getProductsEntitiesHandler,
  postProductsEntitiesHandler,
} from '@/app/api/v2/products/entities/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ type: string }>(getProductsEntitiesHandler, {
  source: 'v2.products.entities.[type].GET',
  requireAuth: true,
  cacheControl: 'private, max-age=300, stale-while-revalidate=600',
});

export const POST = apiHandlerWithParams<{ type: string }>(postProductsEntitiesHandler, {
  source: 'v2.products.entities.[type].POST',
  requireAuth: true,
});

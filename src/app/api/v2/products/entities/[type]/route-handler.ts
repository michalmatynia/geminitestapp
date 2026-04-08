export const runtime = 'nodejs';

import {
  GET_products_entities_handler,
  POST_products_entities_handler,
} from '@/app/api/v2/products/entities/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ type: string }>(GET_products_entities_handler, {
  source: 'v2.products.entities.[type].GET',
  requireAuth: true,
  cacheControl: 'private, max-age=300, stale-while-revalidate=600',
});

export const POST = apiHandlerWithParams<{ type: string }>(POST_products_entities_handler, {
  source: 'v2.products.entities.[type].POST',
  requireAuth: true,
});

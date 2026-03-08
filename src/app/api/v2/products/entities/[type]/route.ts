export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_products_entities_handler,
  POST_products_entities_handler,
} from '@/app/api/v2/products/entities/handler';

export const GET = apiHandlerWithParams<{ type: string }>(GET_products_entities_handler, {
  source: 'v2.products.entities.[type].GET',
});

export const POST = apiHandlerWithParams<{ type: string }>(POST_products_entities_handler, {
  source: 'v2.products.entities.[type].POST',
});

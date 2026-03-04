export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_products_entities_handler,
  POST_products_entities_handler,
} from '@/app/api/v2/products/entities/handler';

export const GET = apiHandlerWithParams(GET_products_entities_handler, {
  source: 'products-entities.GET',
});

export const POST = apiHandlerWithParams(POST_products_entities_handler, {
  source: 'products-entities.POST',
});

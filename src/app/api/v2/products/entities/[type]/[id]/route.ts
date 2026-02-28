export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { 
  GET_products_entity_handler, 
  PUT_products_entity_handler, 
  DELETE_products_entity_handler 
} from '@/app/api/v2/products/entities/handler';

export const GET = apiHandlerWithParams(GET_products_entity_handler, {
  source: 'products-entity.GET',
});

export const PUT = apiHandlerWithParams(PUT_products_entity_handler, {
  source: 'products-entity.PUT',
});

export const DELETE = apiHandlerWithParams(DELETE_products_entity_handler, {
  source: 'products-entity.DELETE',
});

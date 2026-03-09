export const runtime = 'nodejs';

import {
  GET_products_entity_handler,
  PUT_products_entity_handler,
  DELETE_products_entity_handler,
} from '@/app/api/v2/products/entities/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ type: string; id: string }>(GET_products_entity_handler, {
  source: 'v2.products.entities.[type].[id].GET',
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(PUT_products_entity_handler, {
  source: 'v2.products.entities.[type].[id].PUT',
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(DELETE_products_entity_handler, {
  source: 'v2.products.entities.[type].[id].DELETE',
});

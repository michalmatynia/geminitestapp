export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { 
  GET_products_metadata_id_handler, 
  PUT_products_metadata_id_handler, 
  DELETE_products_metadata_id_handler 
} from './handler';

export const GET = apiHandlerWithParams(GET_products_metadata_id_handler, {
  source: 'products-metadata-id.GET',
});

export const PUT = apiHandlerWithParams(PUT_products_metadata_id_handler, {
  source: 'products-metadata-id.PUT',
});

export const DELETE = apiHandlerWithParams(DELETE_products_metadata_id_handler, {
  source: 'products-metadata-id.DELETE',
});

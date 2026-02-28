export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_products_metadata_handler, POST_products_metadata_handler } from '../handler';

export const GET = apiHandlerWithParams(GET_products_metadata_handler, {
  source: 'products-metadata.GET',
});

export const POST = apiHandlerWithParams(POST_products_metadata_handler, {
  source: 'products-metadata.POST',
});

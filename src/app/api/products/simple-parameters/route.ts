export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_products_metadata_handler,
  POST_products_metadata_handler,
} from '../../v2/products/metadata/handler';

export const GET = apiHandler(
  (req, ctx) => GET_products_metadata_handler(req, ctx, { type: 'simple-parameters' }),
  { source: 'products.simple-parameters.GET' }
);

export const POST = apiHandler(
  (req, ctx) => POST_products_metadata_handler(req, ctx, { type: 'simple-parameters' }),
  { source: 'products.simple-parameters.POST' }
);

export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_products_metadata_id_handler,
  PUT_products_metadata_id_handler,
  DELETE_products_metadata_id_handler,
} from '../../v2/products/metadata/[type]/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) =>
    GET_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id }),
  { source: 'price-groups.[id].GET' }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) =>
    PUT_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id }),
  { source: 'price-groups.[id].PUT' }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) =>
    DELETE_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id }),
  { source: 'price-groups.[id].DELETE' }
);

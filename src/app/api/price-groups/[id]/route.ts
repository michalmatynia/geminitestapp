export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import {
  GET_products_metadata_id_handler,
  PUT_products_metadata_id_handler,
  DELETE_products_metadata_id_handler,
} from '../../v2/products/metadata/[type]/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.price-groups.[id].GET',
      context: { route: '/api/price-groups/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/price-groups/[id]',
      method: 'GET',
      source: 'api.compat.price-groups.[id].GET',
    });
    return GET_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id });
  },
  { source: 'price-groups.[id].GET' }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.price-groups.[id].PUT',
      context: { route: '/api/price-groups/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/price-groups/[id]',
      method: 'PUT',
      source: 'api.compat.price-groups.[id].PUT',
    });
    return PUT_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id });
  },
  { source: 'price-groups.[id].PUT' }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.price-groups.[id].DELETE',
      context: { route: '/api/price-groups/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/price-groups/[id]',
      method: 'DELETE',
      source: 'api.compat.price-groups.[id].DELETE',
    });
    return DELETE_products_metadata_id_handler(req, ctx, { type: 'price-groups', id: params.id });
  },
  { source: 'price-groups.[id].DELETE' }
);

export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import {
  GET_products_metadata_handler,
  POST_products_metadata_handler,
} from '../v2/products/metadata/handler';

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.price-groups.GET',
      context: { route: '/api/price-groups' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/price-groups',
      method: 'GET',
      source: 'api.compat.price-groups.GET',
    });
    return GET_products_metadata_handler(req, ctx, { type: 'price-groups' });
  },
  { source: 'price-groups.GET' }
);

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.price-groups.POST',
      context: { route: '/api/price-groups' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/price-groups',
      method: 'POST',
      source: 'api.compat.price-groups.POST',
    });
    return POST_products_metadata_handler(req, ctx, { type: 'price-groups' });
  },
  { source: 'price-groups.POST' }
);

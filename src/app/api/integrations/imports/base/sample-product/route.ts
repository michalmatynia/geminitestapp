export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.sample-product.GET',
      context: { route: '/api/integrations/imports/base/sample-product' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/sample-product',
      method: 'GET',
      source: 'api.compat.integrations.imports.base.sample-product.GET',
    });
    return GET_handler(req, ctx);
  },
  {
    source: 'products.imports.base.sample-product.GET',
    requireCsrf: false,
  }
);

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.sample-product.POST',
      context: { route: '/api/integrations/imports/base/sample-product' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/sample-product',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.sample-product.POST',
    });
    return POST_handler(req, ctx);
  },
  {
    source: 'products.imports.base.sample-product.POST',
    requireCsrf: false,
  }
);

export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.products.[id].listings.GET',
      context: { route: '/api/integrations/products/[id]/listings' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/products/[id]/listings',
      method: 'GET',
      source: 'api.compat.integrations.products.[id].listings.GET',
    });
    return GET_handler(req, ctx, params);
  },
  {
    source: 'integrations.products.[id].listings.GET',
    requireCsrf: false,
  }
);

export const POST = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.products.[id].listings.POST',
      context: { route: '/api/integrations/products/[id]/listings' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/products/[id]/listings',
      method: 'POST',
      source: 'api.compat.integrations.products.[id].listings.POST',
    });
    return POST_handler(req, ctx, params);
  },
  {
    source: 'integrations.products.[id].listings.POST',
    requireCsrf: false,
  }
);

export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_intl_handler, POST_intl_handler } from '../v2/metadata/handler';

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.countries.GET',
      context: { route: '/api/countries' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/countries',
      method: 'GET',
      source: 'api.compat.countries.GET',
    });
    return GET_intl_handler(req, ctx, { type: 'countries' });
  },
  {
    source: 'countries.GET',
    cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  }
);

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.countries.POST',
      context: { route: '/api/countries' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/countries',
      method: 'POST',
      source: 'api.compat.countries.POST',
    });
    return POST_intl_handler(req, ctx, { type: 'countries' });
  },
  {
    source: 'countries.POST',
  }
);

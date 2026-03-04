export const runtime = 'nodejs';
export const revalidate = 86400;

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_intl_handler, POST_intl_handler } from '../v2/metadata/handler';

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.languages.GET',
      context: { route: '/api/languages' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/languages',
      method: 'GET',
      source: 'api.compat.languages.GET',
    });
    return GET_intl_handler(req, ctx, { type: 'languages' });
  },
  {
    source: 'languages.GET',
    cacheControl: 'public, s-maxage=86400, stale-while-revalidate=3600',
  }
);

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.languages.POST',
      context: { route: '/api/languages' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/languages',
      method: 'POST',
      source: 'api.compat.languages.POST',
    });
    return POST_intl_handler(req, ctx, { type: 'languages' });
  },
  {
    source: 'languages.POST',
  }
);

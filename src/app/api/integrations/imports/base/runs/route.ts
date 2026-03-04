export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_handler, POST_handler, listRunsQuerySchema, startRunSchema } from './handler';

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.runs.GET',
      context: { route: '/api/integrations/imports/base/runs' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/runs',
      method: 'GET',
      source: 'api.compat.integrations.imports.base.runs.GET',
    });
    return GET_handler(req, ctx);
  },
  {
    source: 'integrations.imports.base.runs.GET',
    requireCsrf: false,
    querySchema: listRunsQuerySchema,
  }
);

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.runs.POST',
      context: { route: '/api/integrations/imports/base/runs' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/runs',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.runs.POST',
    });
    return POST_handler(req, ctx);
  },
  {
    source: 'integrations.imports.base.runs.POST',
    requireCsrf: false,
    parseJsonBody: true,
    bodySchema: startRunSchema,
  }
);

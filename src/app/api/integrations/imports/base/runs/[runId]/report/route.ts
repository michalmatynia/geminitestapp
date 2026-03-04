export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.runs.[runId].report.GET',
      context: { route: '/api/integrations/imports/base/runs/[runId]/report' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/runs/[runId]/report',
      method: 'GET',
      source: 'api.compat.integrations.imports.base.runs.[runId].report.GET',
    });
    return GET_handler(req, ctx, params);
  },
  {
    source: 'integrations.imports.base.runs.[runId].report.GET',
    requireCsrf: false,
  }
);
